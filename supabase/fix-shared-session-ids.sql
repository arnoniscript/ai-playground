-- =============================================================================
-- FIX: Repair shared session_ids in data labeling evaluations
-- =============================================================================
-- PROBLEM: The frontend generated a single session_id per page load. When a user
--          evaluated multiple tasks without reloading the page, all evaluations
--          shared the same session_id. The consolidation SQL function joins by
--          session_id, causing answers from different tasks to be mixed together.
--
-- STRATEGY: For each group of parent_task_evaluations sharing a session_id:
--   1. Keep the FIRST (oldest) PTE with the original session_id
--   2. For every subsequent PTE, generate a new session_id
--   3. Re-assign evaluation rows to the correct PTE using time-window matching:
--      each PTE "owns" evaluations whose created_at falls between its evaluated_at
--      and the next PTE's evaluated_at
--
-- SAFETY: This script is wrapped in a transaction and creates a backup table.
--         Run the diagnostic queries first (Section 0) to understand the scope.
-- =============================================================================

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 0 — DIAGNOSTIC (run these first, read-only)                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- 0a. How many shared session_ids exist?
-- SELECT session_id, COUNT(*) as pte_count
-- FROM parent_task_evaluations
-- GROUP BY session_id
-- HAVING COUNT(*) > 1
-- ORDER BY pte_count DESC;

-- 0b. Total affected parent_task_evaluations
-- SELECT COUNT(*) as affected_ptes
-- FROM parent_task_evaluations
-- WHERE session_id IN (
--   SELECT session_id FROM parent_task_evaluations
--   GROUP BY session_id HAVING COUNT(*) > 1
-- );

-- 0c. Total evaluation rows with shared session_ids
-- SELECT COUNT(*) as affected_evaluations
-- FROM evaluations
-- WHERE session_id IN (
--   SELECT session_id FROM parent_task_evaluations
--   GROUP BY session_id HAVING COUNT(*) > 1
-- );


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 1 — BACKUP (always run before the fix)                         ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Backup both tables so we can rollback if needed
CREATE TABLE IF NOT EXISTS _backup_parent_task_evaluations AS
  SELECT * FROM parent_task_evaluations;

CREATE TABLE IF NOT EXISTS _backup_evaluations_session_fix AS
  SELECT id, session_id, created_at
  FROM evaluations
  WHERE session_id IN (
    SELECT session_id FROM parent_task_evaluations
    GROUP BY session_id HAVING COUNT(*) > 1
  );


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 2 — FIX (the actual repair)                                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

DO $$
DECLARE
  shared_session RECORD;
  pte_record RECORD;
  new_sid UUID;
  window_start TIMESTAMPTZ;
  window_end TIMESTAMPTZ;
  updated_eval_count INT;
  total_ptes_fixed INT := 0;
  total_evals_fixed INT := 0;
  pte_idx INT;
BEGIN
  RAISE NOTICE '=== Starting shared session_id repair ===';

  -- Loop through each session_id that has multiple parent_task_evaluations
  FOR shared_session IN
    SELECT session_id, COUNT(*) as cnt
    FROM parent_task_evaluations
    GROUP BY session_id
    HAVING COUNT(*) > 1
    ORDER BY session_id
  LOOP
    RAISE NOTICE 'Processing session_id: %, % PTEs', shared_session.session_id, shared_session.cnt;

    pte_idx := 0;

    -- Process each PTE in this group, ordered by evaluated_at.
    -- Skip the FIRST one (it keeps the original session_id).
    -- For each subsequent one, compute the time window and re-assign evaluations.
      FOR pte_record IN
        SELECT 
          pte.id,
          pte.parent_task_id,
          pte.user_id,
          pte.session_id,
          pte.evaluated_at,
          LEAD(pte.evaluated_at) OVER (ORDER BY pte.evaluated_at) as next_pte_evaluated_at,
          LAG(pte.evaluated_at) OVER (ORDER BY pte.evaluated_at) as prev_pte_evaluated_at
        FROM parent_task_evaluations pte
        WHERE pte.session_id = shared_session.session_id
        ORDER BY pte.evaluated_at
      LOOP
        pte_idx := pte_idx + 1;

        IF pte_idx = 1 THEN
          -- First PTE: keep the original session_id but still assign its time window.
          -- Its window is: [-infinity, midpoint to next PTE)
          -- We'll update the evaluations for this one too, to ensure correctness
          -- when there are evaluations from other tasks mixed in.
          
          IF pte_record.next_pte_evaluated_at IS NOT NULL THEN
            -- Window: everything before the midpoint between this and next PTE
            window_end := pte_record.evaluated_at + 
              (pte_record.next_pte_evaluated_at - pte_record.evaluated_at) / 2;
          ELSE
            -- Only one in sequence (shouldn't happen in this loop, but safety)
            window_end := 'infinity'::timestamptz;
          END IF;

          -- For the first PTE, ensure only its evaluations have this session_id
          -- (evaluations created before the midpoint to the next PTE)
          -- We don't update the first one's session_id — it stays the same.
          -- The eval reassignment happens below for subsequent PTEs.
          
          RAISE NOTICE '  PTE #% (KEEP original): pte_id=%, evaluated_at=%, window_end=%',
            pte_idx, pte_record.id, pte_record.evaluated_at, window_end;

        ELSE
          -- Subsequent PTEs: generate new session_id and reassign evaluations
          new_sid := uuid_generate_v4();

          -- Compute this PTE's time window:
          -- Start = midpoint between previous PTE and this one
          -- End = midpoint between this one and next PTE (or infinity for last)
          
          window_start := pte_record.prev_pte_evaluated_at + 
            (pte_record.evaluated_at - pte_record.prev_pte_evaluated_at) / 2;

          IF pte_record.next_pte_evaluated_at IS NOT NULL THEN
            window_end := pte_record.evaluated_at + 
              (pte_record.next_pte_evaluated_at - pte_record.evaluated_at) / 2;
          ELSE
            window_end := 'infinity'::timestamptz;
          END IF;

          RAISE NOTICE '  PTE #%: pte_id=%, new_sid=%, window=[%, %)',
            pte_idx, pte_record.id, new_sid, window_start, window_end;

          -- Update evaluations in this time window to use the new session_id
          UPDATE evaluations
          SET session_id = new_sid
          WHERE session_id = shared_session.session_id
            AND user_id = pte_record.user_id
            AND created_at >= window_start
            AND created_at < window_end;

          GET DIAGNOSTICS updated_eval_count = ROW_COUNT;
          total_evals_fixed := total_evals_fixed + updated_eval_count;

          RAISE NOTICE '    -> Updated % evaluation rows', updated_eval_count;

          -- Update the parent_task_evaluation to use the new session_id
          UPDATE parent_task_evaluations
          SET session_id = new_sid
          WHERE id = pte_record.id;

          total_ptes_fixed := total_ptes_fixed + 1;
        END IF;
      END LOOP;
  END LOOP;

  RAISE NOTICE '=== Repair complete ===';
  RAISE NOTICE 'Total PTEs re-assigned: %', total_ptes_fixed;
  RAISE NOTICE 'Total evaluation rows re-assigned: %', total_evals_fixed;
END;
$$;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 3 — VERIFICATION (run after the fix)                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- 3a. Should return 0 rows (no more shared session_ids)
SELECT session_id, COUNT(*) as pte_count
FROM parent_task_evaluations
GROUP BY session_id
HAVING COUNT(*) > 1;

-- 3b. Verify each PTE now has the correct number of evaluations
-- (should match the number of questions in the playground)
SELECT 
  pte.id as pte_id,
  pte.parent_task_id,
  pte.session_id,
  COUNT(e.id) as eval_count
FROM parent_task_evaluations pte
LEFT JOIN evaluations e ON e.session_id = pte.session_id
WHERE pte.session_id IN (
  SELECT session_id FROM _backup_parent_task_evaluations
  WHERE session_id IN (
    SELECT session_id FROM _backup_parent_task_evaluations
    GROUP BY session_id HAVING COUNT(*) > 1
  )
)
OR pte.id IN (
  SELECT id FROM _backup_parent_task_evaluations
  WHERE session_id IN (
    SELECT session_id FROM _backup_parent_task_evaluations
    GROUP BY session_id HAVING COUNT(*) > 1
  )
)
GROUP BY pte.id, pte.parent_task_id, pte.session_id
ORDER BY pte.parent_task_id;

-- 3c. Spot-check: pick a previously affected parent_task and see its consolidation data
-- SELECT * FROM get_parent_task_consolidation_data('<parent_task_id_here>');


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 4 — ROLLBACK (only if something went wrong)                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- To rollback, uncomment and run:
--
-- -- Restore parent_task_evaluations session_ids
-- UPDATE parent_task_evaluations pte
-- SET session_id = bk.session_id
-- FROM _backup_parent_task_evaluations bk
-- WHERE pte.id = bk.id;
--
-- -- Restore evaluations session_ids
-- UPDATE evaluations e
-- SET session_id = bk.session_id
-- FROM _backup_evaluations_session_fix bk
-- WHERE e.id = bk.id;
--
-- -- Drop backup tables after successful verification
-- -- DROP TABLE IF EXISTS _backup_parent_task_evaluations;
-- -- DROP TABLE IF EXISTS _backup_evaluations_session_fix;
