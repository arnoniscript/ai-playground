import { Router } from 'express';
import { supabase } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { config } from '../config.js';
import {
  CurationConversation,
  NextCurationConversation,
  CurationMetrics,
} from '../types.js';

const router = Router();

// ============================================================
// ElevenLabs API helpers
// ============================================================

async function elevenLabsFetch(path: string, options: RequestInit = {}) {
  const url = `${config.elevenlabs.baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'xi-api-key': config.elevenlabs.apiKey,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs API error ${res.status}: ${body}`);
  }
  return res.json();
}

/**
 * Fetch conversations list from ElevenLabs with optional filters
 */
async function fetchConversations(agentId: string, opts?: {
  cursor?: string;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
}) {
  const params = new URLSearchParams();
  params.set('agent_id', agentId);
  if (opts?.cursor) params.set('cursor', opts.cursor);
  if (opts?.pageSize) params.set('page_size', String(opts.pageSize));
  // ElevenLabs list API uses call_start_after_unix / call_start_before_unix
  if (opts?.startDate) {
    const ts = Math.floor(new Date(opts.startDate).getTime() / 1000);
    params.set('call_start_after_unix', String(ts));
  }
  if (opts?.endDate) {
    const ts = Math.floor(new Date(opts.endDate).getTime() / 1000);
    params.set('call_start_before_unix', String(ts));
  }

  const endpoint = config.elevenlabs.callsEndpoint;
  return elevenLabsFetch(`${endpoint}?${params.toString()}`);
}

/**
 * Fetch a single conversation's detail (transcript, audio, etc.)
 */
async function fetchConversationDetail(conversationId: string): Promise<any> {
  const endpoint = config.elevenlabs.callDetailEndpoint.replace(
    '{conversation_id}',
    conversationId,
  );
  return elevenLabsFetch(endpoint);
}

// ============================================================
// Exported sync helper (reusable from admin route)
// ============================================================

/**
 * Fetch all conversations (light metadata) from ElevenLabs for a given agent + date range.
 * Returns raw conversation summaries – nothing is persisted.
 */
export async function fetchAllConversationsFromElevenLabs(opts: {
  agentId: string;
  dateStart?: string;
  dateEnd?: string;
}): Promise<any[]> {
  const { agentId, dateStart, dateEnd } = opts;

  let allConversations: any[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const result: any = await fetchConversations(agentId, {
      cursor,
      pageSize: 100,
      startDate: dateStart,
      endDate: dateEnd,
    });

    const conversations = result.conversations || [];
    allConversations = [...allConversations, ...conversations];

    if (result.has_more && result.next_cursor) {
      cursor = result.next_cursor;
    } else {
      hasMore = false;
    }
  }

  return allConversations;
}

/**
 * Persist a set of pre-selected conversations into a playground.
 * `conversations` can be the raw ElevenLabs summaries or objects with at least `conversation_id`.
 * Does NOT fetch transcript or audio – those are loaded on demand.
 */
export async function insertConversationsForPlayground(opts: {
  playgroundId: string;
  agentId: string;
  conversations: any[];
  passesPerConversation?: number;
}): Promise<{ synced_count: number }> {
  const { playgroundId, agentId, conversations, passesPerConversation } = opts;
  const passesCount = passesPerConversation || 1;

  console.log(`=== INSERT ${conversations.length} conversations for playground ${playgroundId} ===`);

  const inserted: CurationConversation[] = [];
  for (const conv of conversations) {
    const { data: record, error: insertError } = await supabase
      .from('curation_conversations')
      .upsert(
        {
          playground_id: playgroundId,
          conversation_id: conv.conversation_id,
          agent_id: agentId,
          duration_seconds: conv.call_duration_secs || conv.duration_seconds || null,
          call_datetime: conv.start_time_unix_secs
            ? new Date(conv.start_time_unix_secs * 1000).toISOString()
            : conv.call_datetime || null,
          call_status: conv.call_successful || conv.status || null,
          call_termination_reason: conv.end_reason || conv.termination_reason || null,
          status: 'pending',
          selected: true,
          max_passes: passesCount,
          current_passes: 0,
          metadata: conv.metadata || null,
          synced_at: new Date().toISOString(),
        },
        { onConflict: 'playground_id,conversation_id' },
      )
      .select()
      .single();

    if (!insertError && record) {
      inserted.push(record);
    } else if (insertError) {
      console.error(`Error upserting conversation ${conv.conversation_id}:`, insertError);
    }
  }

  console.log(`Synced ${inserted.length} conversations`);
  return { synced_count: inserted.length };
}

/**
 * Legacy helper – fetches from ElevenLabs AND inserts into DB in one go.
 * Used by the manual re-sync route.
 */
export async function syncConversationsForPlayground(opts: {
  playgroundId: string;
  agentId: string;
  dateStart?: string;
  dateEnd?: string;
  passesPerConversation?: number;
}): Promise<{ total_fetched: number; synced_count: number }> {
  const allConversations = await fetchAllConversationsFromElevenLabs({
    agentId: opts.agentId,
    dateStart: opts.dateStart,
    dateEnd: opts.dateEnd,
  });

  const { synced_count } = await insertConversationsForPlayground({
    playgroundId: opts.playgroundId,
    agentId: opts.agentId,
    conversations: allConversations,
    passesPerConversation: opts.passesPerConversation,
  });

  return { total_fetched: allConversations.length, synced_count };
}

// ============================================================
// Routes
// ============================================================

/**
 * GET /curation/agents
 * List configured ElevenLabs agent IDs
 */
router.get(
  '/agents',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userRole = req.user!.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    res.json({ agents: config.elevenlabs.agentIds });
  }),
);

/**
 * POST /curation/preview-conversations
 * Fetch conversations (light metadata) from ElevenLabs for preview/selection BEFORE creating a playground.
 * Nothing is persisted – this is purely a preview.
 * Body: { agent_id, date_start, date_end }
 */
router.post(
  '/preview-conversations',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userRole = req.user!.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { agent_id, date_start, date_end } = req.body;
    if (!agent_id) {
      return res.status(400).json({ error: 'agent_id is required' });
    }

    console.log(`=== PREVIEW CONVERSATIONS ===`);
    console.log(`Agent: ${agent_id}, Start: ${date_start}, End: ${date_end}`);

    try {
      const allConversations = await fetchAllConversationsFromElevenLabs({
        agentId: agent_id,
        dateStart: date_start,
        dateEnd: date_end,
      });

      // Return lightweight summaries for the frontend table
      const conversations = allConversations.map((c: any) => ({
        conversation_id: c.conversation_id,
        agent_id: c.agent_id,
        call_duration_secs: c.call_duration_secs || 0,
        start_time_unix_secs: c.start_time_unix_secs || 0,
        status: c.status || null,
        call_successful: c.call_successful || null,
        message_count: c.message_count || 0,
        call_summary_title: c.call_summary_title || null,
      }));

      console.log(`Preview: ${conversations.length} conversations found`);

      res.json({
        conversations,
        total: conversations.length,
      });
    } catch (error: any) {
      console.error('Error previewing conversations:', error);
      res.status(500).json({ error: `Failed to fetch conversations: ${error.message}` });
    }
  }),
);

/**
 * POST /curation/sync-conversations/:playgroundId
 * Sync conversations from ElevenLabs for a date-range curation playground.
 * Body: { agent_id, date_start, date_end, passes_per_conversation? }
 */
router.post(
  '/sync-conversations/:playgroundId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { playgroundId } = req.params;
    const userRole = req.user!.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { agent_id, date_start, date_end, passes_per_conversation } = req.body;

    if (!agent_id) {
      return res.status(400).json({ error: 'agent_id is required' });
    }

    // Validate playground
    const { data: playground, error: pgError } = await supabase
      .from('playgrounds')
      .select('id, type, curation_mode')
      .eq('id', playgroundId)
      .single();

    if (pgError || !playground) {
      return res.status(404).json({ error: 'Playground not found' });
    }

    if (playground.type !== 'curation') {
      return res.status(400).json({ error: 'Playground must be curation type' });
    }

    try {
      const result = await syncConversationsForPlayground({
        playgroundId,
        agentId: agent_id,
        dateStart: date_start,
        dateEnd: date_end,
        passesPerConversation: passes_per_conversation,
      });

      res.json({
        message: `Synced ${result.synced_count} conversations`,
        ...result,
      });
    } catch (error: any) {
      console.error('Error syncing conversations:', error);
      res.status(500).json({ error: `Failed to sync conversations: ${error.message}` });
    }
  }),
);

/**
 * GET /curation/conversations/:playgroundId
 * List all conversations for a curation playground (admin)
 */
router.get(
  '/conversations/:playgroundId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { playgroundId } = req.params;

    const { data, error } = await supabase
      .from('curation_conversations')
      .select('*')
      .eq('playground_id', playgroundId)
      .order('call_datetime', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return res.status(500).json({ error: 'Failed to fetch conversations' });
    }

    res.json({ data: data || [] });
  }),
);

/**
 * PUT /curation/conversations/:playgroundId/selection
 * Update selected state of conversations (admin, for date_range mode)
 * Body: { conversation_ids: string[], selected: boolean }
 */
router.put(
  '/conversations/:playgroundId/selection',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { playgroundId } = req.params;
    const userRole = req.user!.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { conversation_ids, selected } = req.body;

    if (!conversation_ids || !Array.isArray(conversation_ids)) {
      return res.status(400).json({ error: 'conversation_ids array is required' });
    }

    const { error } = await supabase
      .from('curation_conversations')
      .update({ selected, updated_at: new Date().toISOString() })
      .eq('playground_id', playgroundId)
      .in('conversation_id', conversation_ids);

    if (error) {
      return res.status(500).json({ error: 'Failed to update selection' });
    }

    res.json({ success: true });
  }),
);

/**
 * PUT /curation/conversations/:playgroundId/select-all
 * Select or deselect all conversations (admin)
 * Body: { selected: boolean }
 */
router.put(
  '/conversations/:playgroundId/select-all',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { playgroundId } = req.params;
    const userRole = req.user!.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { selected } = req.body;

    const { error } = await supabase
      .from('curation_conversations')
      .update({ selected, updated_at: new Date().toISOString() })
      .eq('playground_id', playgroundId);

    if (error) {
      return res.status(500).json({ error: 'Failed to update selection' });
    }

    res.json({ success: true });
  }),
);

/**
 * GET /curation/next-conversation/:playgroundId
 * Get next conversation for a user to evaluate
 */
router.get(
  '/next-conversation/:playgroundId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { playgroundId } = req.params;
    const userId = req.user!.id;

    // Check playground mode
    const { data: playground } = await supabase
      .from('playgrounds')
      .select('curation_mode, curation_agent_id')
      .eq('id', playgroundId)
      .single();

    if (!playground) {
      return res.status(404).json({ error: 'Playground not found' });
    }

    if (playground.curation_mode === 'continuous') {
      // For continuous mode, fetch a random conversation from ElevenLabs
      // that the user hasn't evaluated yet
      try {
        // First, try from already-synced conversations
        const { data, error } = await supabase.rpc('get_next_curation_conversation', {
          p_playground_id: playgroundId,
          p_user_id: userId,
        });

        if (!error && data && data.length > 0) {
          // Check if we have transcript loaded, if not fetch detail
          let conversation = data[0];
          if (!conversation.transcript || !conversation.audio_url) {
            // Fetch detail from ElevenLabs
            try {
              const detail = await fetchConversationDetail(conversation.conversation_id);
              const transcript = detail.transcript || detail.analysis?.transcript || null;
              const audioUrl = detail.recording_url || detail.audio_url || null;

              // Update in DB
              await supabase
                .from('curation_conversations')
                .update({
                  transcript,
                  audio_url: audioUrl,
                  duration_seconds: detail.call_duration_secs || detail.metadata?.call_duration_secs || conversation.duration_seconds,
                  call_termination_reason: detail.end_reason || detail.termination_reason || null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', conversation.conversation_record_id);

              conversation = {
                ...conversation,
                transcript,
                audio_url: audioUrl,
              };
            } catch (detailError) {
              console.error('Error fetching conversation detail:', detailError);
            }
          }

          return res.json(conversation);
        }

        // If no synced conversations available, fetch a random one from ElevenLabs
        const agentId = playground.curation_agent_id;
        if (!agentId) {
          return res.status(404).json({ error: 'No agent configured' });
        }

        // Fetch recent conversations from ElevenLabs
        const result: any = await fetchConversations(agentId, { pageSize: 50 });
        const conversations = result.conversations || [];

        if (conversations.length === 0) {
          return res.status(404).json({ error: 'No conversations available' });
        }

        // Get IDs of conversations this user already evaluated
        const { data: existingEvals } = await supabase
          .from('curation_evaluations')
          .select('conversation_record_id')
          .eq('user_id', userId);

        const evaluatedRecordIds = new Set((existingEvals || []).map(e => e.conversation_record_id));

        // Get existing conversation records for this playground
        const { data: existingRecords } = await supabase
          .from('curation_conversations')
          .select('id, conversation_id')
          .eq('playground_id', playgroundId);

        const existingConvMap = new Map(
          (existingRecords || []).map(r => [r.conversation_id, r.id])
        );

        // Filter out conversations the user already evaluated
        const evaluatedConvIds = new Set<string>();
        for (const [convId, recordId] of existingConvMap.entries()) {
          if (evaluatedRecordIds.has(recordId)) {
            evaluatedConvIds.add(convId);
          }
        }

        const availableConvs = conversations.filter(
          (c: any) => !evaluatedConvIds.has(c.conversation_id),
        );

        if (availableConvs.length === 0) {
          return res.status(404).json({ error: 'No available conversations' });
        }

        // Pick a random one
        const randomConv = availableConvs[Math.floor(Math.random() * availableConvs.length)];

        // Sync to DB if not already there
        let recordId: string;
        if (existingConvMap.has(randomConv.conversation_id)) {
          recordId = existingConvMap.get(randomConv.conversation_id)!;
        } else {
          const { data: newRecord, error: insertError } = await supabase
            .from('curation_conversations')
            .insert({
              playground_id: playgroundId,
              conversation_id: randomConv.conversation_id,
              agent_id: agentId,
              duration_seconds: randomConv.call_duration_secs || null,
              call_datetime: randomConv.start_time_unix_secs
                ? new Date(randomConv.start_time_unix_secs * 1000).toISOString()
                : null,
              call_status: randomConv.call_successful || randomConv.status || null,
              call_termination_reason: randomConv.end_reason || randomConv.termination_reason || null,
              status: 'pending',
              selected: true,
              max_passes: 1, // Continuous mode defaults to 1
              current_passes: 0,
            })
            .select()
            .single();

          if (insertError || !newRecord) {
            console.error('Error inserting conversation:', insertError);
            return res.status(500).json({ error: 'Failed to sync conversation' });
          }
          recordId = newRecord.id;
        }

        // Fetch detail for transcript + audio
        let transcript = null;
        let audioUrl = null;
        let durationSeconds = randomConv.call_duration_secs || null;

        try {
          const detail = await fetchConversationDetail(randomConv.conversation_id);
          transcript = detail.transcript || detail.analysis?.transcript || null;
          audioUrl = detail.recording_url || detail.audio_url || null;
          durationSeconds = detail.call_duration_secs || detail.metadata?.call_duration_secs || durationSeconds;

          // Update in DB with transcript/audio
          await supabase
            .from('curation_conversations')
            .update({
              transcript,
              audio_url: audioUrl,
              duration_seconds: durationSeconds,
              call_termination_reason: detail.end_reason || detail.termination_reason || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', recordId);
        } catch (detailError) {
          console.error('Error fetching conversation detail:', detailError);
        }

        const nextConv: NextCurationConversation = {
          conversation_record_id: recordId,
          conversation_id: randomConv.conversation_id,
          agent_id: agentId,
          duration_seconds: durationSeconds,
          call_datetime: randomConv.start_time_unix_secs
            ? new Date(randomConv.start_time_unix_secs * 1000).toISOString()
            : null,
          transcript,
          audio_url: audioUrl,
          call_status: randomConv.call_successful || randomConv.status || null,
          call_termination_reason: randomConv.end_reason || randomConv.termination_reason || null,
          metadata: randomConv.metadata || null,
        };

        return res.json(nextConv);
      } catch (error: any) {
        console.error('Error getting next conversation:', error);
        return res.status(500).json({ error: `Failed to get next conversation: ${error.message}` });
      }
    } else {
      // date_range mode - use the SQL function
      const { data, error } = await supabase.rpc('get_next_curation_conversation', {
        p_playground_id: playgroundId,
        p_user_id: userId,
      });

      if (error) {
        console.error('Error getting next conversation:', error);
        return res.status(500).json({ error: 'Failed to get next conversation' });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'No available conversations' });
      }

      let conversation = data[0];

      // Fetch detail if transcript/audio not yet loaded
      if (!conversation.transcript || !conversation.audio_url) {
        try {
          const detail = await fetchConversationDetail(conversation.conversation_id);
          const transcript = detail.transcript || detail.analysis?.transcript || null;
          const audioUrl = detail.recording_url || detail.audio_url || null;

          await supabase
            .from('curation_conversations')
            .update({
              transcript,
              audio_url: audioUrl,
              duration_seconds: detail.call_duration_secs || conversation.duration_seconds,
              call_termination_reason: detail.end_reason || detail.termination_reason || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', conversation.conversation_record_id);

          conversation = { ...conversation, transcript, audio_url: audioUrl };
        } catch (detailError) {
          console.error('Error fetching conversation detail:', detailError);
        }
      }

      res.json(conversation);
    }
  }),
);

/**
 * POST /curation/record-evaluation
 * Record that a user evaluated a conversation
 * Body: { conversation_record_id, session_id }
 */
router.post(
  '/record-evaluation',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { conversation_record_id, session_id } = req.body;
    const userId = req.user!.id;

    if (!conversation_record_id || !session_id) {
      return res.status(400).json({ error: 'conversation_record_id and session_id are required' });
    }

    const { data, error } = await supabase
      .from('curation_evaluations')
      .insert({
        conversation_record_id,
        user_id: userId,
        session_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording evaluation:', error);
      if (error.code === '23505') {
        return res.status(409).json({ error: 'You already evaluated this conversation' });
      }
      return res.status(500).json({ error: 'Failed to record evaluation' });
    }

    res.json({ success: true, evaluation: data });
  }),
);

/**
 * GET /curation/metrics/:playgroundId
 * Get curation metrics for a playground
 */
router.get(
  '/metrics/:playgroundId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { playgroundId } = req.params;

    const { data, error } = await supabase.rpc('get_curation_metrics', {
      p_playground_id: playgroundId,
    });

    if (error) {
      console.error('Error getting metrics:', error);
      return res.status(500).json({ error: 'Failed to get metrics' });
    }

    const metrics: CurationMetrics = data?.[0] || {
      total_conversations: 0,
      selected_conversations: 0,
      pending_conversations: 0,
      in_progress_conversations: 0,
      completed_conversations: 0,
      excluded_conversations: 0,
      total_expected_evaluations: 0,
      completed_evaluations: 0,
      completion_percentage: 0,
    };

    res.json(metrics);
  }),
);

/**
 * GET /curation/detailed-metrics/:playgroundId
 * Get full curation metrics with question analytics and individual evaluations
 */
router.get(
  '/detailed-metrics/:playgroundId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { playgroundId } = req.params;
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // 1. Aggregate stats
    const { data: rpcData } = await supabase.rpc('get_curation_metrics', {
      p_playground_id: playgroundId,
    });
    const aggregateStats = rpcData?.[0] || {};

    // 2. All questions for this playground
    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('playground_id', playgroundId)
      .order('order_index', { ascending: true });

    // 3. All evaluations for this playground (one row per answer)
    const { data: evaluations } = await supabase
      .from('evaluations')
      .select('id, question_id, answer_text, answer_value, rating, user_id, session_id, created_at')
      .eq('playground_id', playgroundId);

    // 4. Compute question metrics with option distribution
    const questionMetrics = (questions || []).map((question: any) => {
      const qEvals = (evaluations || []).filter((e: any) => e.question_id === question.id);
      const totalResponses = qEvals.length;

      let optionDistribution: any[] | null = null;

      if (question.question_type === 'select' && question.options) {
        const counts: Record<string, number> = {};
        qEvals.forEach((e: any) => {
          if (e.answer_value) {
            counts[e.answer_value] = (counts[e.answer_value] || 0) + 1;
          }
        });
        optionDistribution = question.options.map((opt: any) => ({
          option: opt.label,
          value: opt.value,
          count: counts[opt.value] || 0,
          percentage: totalResponses > 0 ? ((counts[opt.value] || 0) / totalResponses) * 100 : 0,
        }));
      }

      return {
        question_id: question.id,
        question_text: question.question_text,
        question_type: question.question_type,
        total_responses: totalResponses,
        option_distribution: optionDistribution,
      };
    });

    // 5. Get open-ended responses
    const openResponses = (evaluations || [])
      .filter((e: any) => {
        const question = (questions || []).find((q: any) => q.id === e.question_id);
        return question?.question_type === 'input_string' && e.answer_text;
      })
      .map((e: any) => {
        const question = (questions || []).find((q: any) => q.id === e.question_id);
        return {
          question_id: e.question_id,
          question_text: question?.question_text || '',
          answer_text: e.answer_text,
          session_id: e.session_id,
          created_at: e.created_at,
        };
      })
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 200);

    // 6. Get curation conversations with their evaluation data
    const { data: conversations } = await supabase
      .from('curation_conversations')
      .select('id, conversation_id, agent_id, duration_seconds, call_datetime, transcript, audio_url, call_status, call_termination_reason, status, selected, max_passes, current_passes, clickup_task_id, clickup_task_url')
      .eq('playground_id', playgroundId)
      .eq('selected', true)
      .order('call_datetime', { ascending: false });

    // 7. Get curation_evaluations joining users for email
    const convIds = (conversations || []).map((c: any) => c.id);
    let curationEvals: any[] | null = null;
    if (convIds.length > 0) {
      const { data, error: ceError } = await supabase
        .from('curation_evaluations')
        .select(`
          id,
          conversation_record_id,
          user_id,
          session_id,
          evaluated_at,
          users!inner(email, full_name)
        `)
        .in('conversation_record_id', convIds);
      if (ceError) {
        console.error('Error fetching curation_evaluations:', ceError);
      }
      curationEvals = data;
    }

    // 8. Build a map from session_id → select-type answers (for filtering)
    const sessionAnswers: Record<string, Record<string, string>> = {};
    const selectQuestionIds = new Set(
      (questions || []).filter((q: any) => q.question_type === 'select').map((q: any) => q.id)
    );
    (evaluations || []).forEach((e: any) => {
      if (e.session_id && selectQuestionIds.has(e.question_id) && e.answer_value) {
        if (!sessionAnswers[e.session_id]) sessionAnswers[e.session_id] = {};
        sessionAnswers[e.session_id][e.question_id] = e.answer_value;
      }
    });

    // 9. Build evaluations list grouped by conversation
    const conversationEvaluations: Record<string, any[]> = {};
    (curationEvals || []).forEach((ce: any) => {
      const recordId = ce.conversation_record_id;
      if (!conversationEvaluations[recordId]) {
        conversationEvaluations[recordId] = [];
      }
      const userInfo = Array.isArray(ce.users) ? ce.users[0] : ce.users;
      conversationEvaluations[recordId].push({
        curation_evaluation_id: ce.id,
        user_id: ce.user_id,
        session_id: ce.session_id,
        user_email: userInfo?.email || 'Desconhecido',
        user_name: userInfo?.full_name || null,
        created_at: ce.evaluated_at,
        answers: sessionAnswers[ce.session_id] || {},
      });
    });

    // Attach evaluations to conversations
    // Use current_passes from DB (maintained by trigger) as authoritative count
    const conversationsWithEvals = (conversations || []).map((conv: any) => ({
      ...conv,
      evaluations: conversationEvaluations[conv.id] || [],
      evaluation_count: conv.current_passes || (conversationEvaluations[conv.id] || []).length,
    }));

    // 9. Unique testers
    const uniqueUserIds = new Set((curationEvals || []).map((ce: any) => ce.user_id));

    res.json({
      data: {
        aggregateStats,
        questionMetrics,
        openResponses,
        conversations: conversationsWithEvals,
        stats: {
          totalConversations: aggregateStats.total_conversations || 0,
          selectedConversations: aggregateStats.selected_conversations || 0,
          completedEvaluations: aggregateStats.completed_evaluations || 0,
          totalExpectedEvaluations: aggregateStats.total_expected_evaluations || 0,
          completionPercentage: aggregateStats.completion_percentage || 0,
          uniqueTesters: uniqueUserIds.size,
        },
      },
    });
  }),
);

/**
 * GET /curation/evaluation-detail/:playgroundId/:sessionId
 * Get detailed evaluation responses for a specific session (for modal)
 */
router.get(
  '/evaluation-detail/:playgroundId/:sessionId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { playgroundId, sessionId } = req.params;
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get evaluations for this session with question details
    const { data: evaluationDetails } = await supabase
      .from('evaluations')
      .select(`
        id,
        question_id,
        answer_text,
        answer_value,
        rating,
        created_at,
        user_id,
        users!inner(email, full_name),
        questions!inner(question_text, question_type, options)
      `)
      .eq('playground_id', playgroundId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!evaluationDetails || evaluationDetails.length === 0) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    const userInfo = Array.isArray(evaluationDetails[0].users)
      ? evaluationDetails[0].users[0]
      : evaluationDetails[0].users;

    const formattedDetails = {
      session_id: sessionId,
      user_email: userInfo?.email || '',
      user_name: userInfo?.full_name || null,
      created_at: evaluationDetails[0].created_at,
      responses: evaluationDetails.map((e: any) => {
        const question = Array.isArray(e.questions) ? e.questions[0] : e.questions;
        return {
          question_id: e.question_id,
          question_text: question?.question_text || '',
          question_type: question?.question_type || '',
          answer_text: e.answer_text,
          answer_value: e.answer_value,
          answer_label: question?.options?.find((opt: any) => opt.value === e.answer_value)?.label || e.answer_value,
          rating: e.rating,
        };
      }),
    };

    res.json({ data: formattedDetails });
  }),
);

/**
 * POST /curation/fetch-detail/:conversationRecordId
 * Fetch and store conversation detail (transcript, audio) from ElevenLabs
 */
router.post(
  '/fetch-detail/:conversationRecordId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { conversationRecordId } = req.params;

    // Get conversation record
    const { data: record, error: recordError } = await supabase
      .from('curation_conversations')
      .select('*')
      .eq('id', conversationRecordId)
      .single();

    if (recordError || !record) {
      return res.status(404).json({ error: 'Conversation record not found' });
    }

    try {
      const detail = await fetchConversationDetail(record.conversation_id);
      const transcript = detail.transcript || detail.analysis?.transcript || null;
      const audioUrl = detail.recording_url || detail.audio_url || null;

      const { error: updateError } = await supabase
        .from('curation_conversations')
        .update({
          transcript,
          audio_url: audioUrl,
          duration_seconds: detail.call_duration_secs || detail.metadata?.call_duration_secs || record.duration_seconds,
          call_termination_reason: detail.end_reason || detail.termination_reason || null,
          metadata: { ...record.metadata, ...detail.metadata },
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationRecordId);

      if (updateError) {
        return res.status(500).json({ error: 'Failed to update conversation detail' });
      }

      res.json({
        success: true,
        transcript,
        audio_url: audioUrl,
        duration_seconds: detail.call_duration_secs || record.duration_seconds,
      });
    } catch (error: any) {
      console.error('Error fetching conversation detail:', error);
      res.status(500).json({ error: `Failed to fetch detail: ${error.message}` });
    }
  }),
);

/**
 * PUT /curation/conversations/:playgroundId/passes
 * Update passes per conversation for a playground (admin)
 * Body: { passes_per_conversation: number }
 */
router.put(
  '/conversations/:playgroundId/passes',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { playgroundId } = req.params;
    const userRole = req.user!.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { passes_per_conversation } = req.body;

    if (!passes_per_conversation || passes_per_conversation < 1) {
      return res.status(400).json({ error: 'passes_per_conversation must be at least 1' });
    }

    // Update all conversations that haven't completed yet
    const { error } = await supabase
      .from('curation_conversations')
      .update({
        max_passes: passes_per_conversation,
        updated_at: new Date().toISOString(),
      })
      .eq('playground_id', playgroundId)
      .in('status', ['pending', 'in_progress']);

    if (error) {
      return res.status(500).json({ error: 'Failed to update passes' });
    }

    // Also update the playground setting
    await supabase
      .from('playgrounds')
      .update({ curation_passes_per_conversation: passes_per_conversation })
      .eq('id', playgroundId);

    res.json({ success: true });
  }),
);

/**
 * GET /curation/audio/:conversationId
 * Proxy the ElevenLabs conversation audio to the client.
 * Supports auth via Authorization header OR ?token= query param (for <audio> tags).
 */
router.get(
  '/audio/:conversationId',
  asyncHandler(async (req, res) => {
    // Support token via query param for <audio src="...?token=xxx">
    if (!req.headers.authorization && req.query.token) {
      req.headers.authorization = `Bearer ${req.query.token}`;
    }

    // Run auth middleware manually
    await new Promise<void>((resolve, reject) => {
      authenticateToken(req, res, (err?: any) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // If auth middleware already sent a response (401/403), stop
    if (res.headersSent) return;

    const { conversationId } = req.params;

    const url = `${config.elevenlabs.baseUrl}/v1/convai/conversations/${conversationId}/audio`;

    try {
      const upstream = await fetch(url, {
        headers: {
          'xi-api-key': config.elevenlabs.apiKey,
        },
      });

      if (!upstream.ok) {
        const body = await upstream.text();
        console.error(`ElevenLabs audio error ${upstream.status}: ${body}`);
        return res.status(upstream.status).json({ error: 'Failed to fetch audio from ElevenLabs' });
      }

      // Read the full response as an ArrayBuffer and send it
      const arrayBuffer = await upstream.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Accept-Ranges', 'bytes');
      res.send(buffer);
    } catch (err: any) {
      console.error('Error proxying audio:', err);
      res.status(500).json({ error: `Audio proxy error: ${err.message}` });
    }
  }),
);

// ============================================================
// ClickUp + OpenAI Integration
// ============================================================

/**
 * POST /curation/generate-task/:conversationRecordId
 * Use GPT 4.1 mini to generate a ClickUp task draft from conversation data.
 * Returns suggested name, description, priority for the frontend form.
 */
router.post(
  '/generate-task/:conversationRecordId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { conversationRecordId } = req.params;

    // Get conversation record with playground name
    const { data: record, error: recordError } = await supabase
      .from('curation_conversations')
      .select('*, playgrounds!inner(name)')
      .eq('id', conversationRecordId)
      .single();

    if (recordError || !record) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (record.clickup_task_id) {
      return res.status(409).json({
        error: 'Task already created for this conversation',
        clickup_task_id: record.clickup_task_id,
        clickup_task_url: record.clickup_task_url,
      });
    }

    // Get evaluations for this conversation
    const { data: curationEvals } = await supabase
      .from('curation_evaluations')
      .select('id, session_id, user_id, evaluated_at, users!inner(email, full_name)')
      .eq('conversation_record_id', conversationRecordId);

    // Get evaluation answers for each session
    const evaluatorData: any[] = [];
    for (const ce of (curationEvals || [])) {
      const userInfo = Array.isArray(ce.users) ? ce.users[0] : ce.users;
      const { data: answers } = await supabase
        .from('evaluations')
        .select('answer_text, answer_value, questions!inner(question_text, question_type, options)')
        .eq('session_id', ce.session_id)
        .eq('playground_id', record.playground_id);

      const formattedAnswers = (answers || []).map((a: any) => {
        const q = Array.isArray(a.questions) ? a.questions[0] : a.questions;
        let answerDisplay = a.answer_text || a.answer_value;
        if (q?.question_type === 'select' && q?.options && a.answer_value) {
          const opt = q.options.find((o: any) => o.value === a.answer_value);
          if (opt) answerDisplay = opt.label;
        }
        if (q?.question_type === 'boolean') {
          answerDisplay = a.answer_value === 'true' ? 'Sim' : 'Não';
        }
        return { question: q?.question_text || '', answer: answerDisplay };
      });

      evaluatorData.push({
        email: userInfo?.email || 'Desconhecido',
        name: userInfo?.full_name || null,
        answers: formattedAnswers,
      });
    }

    // Format transcript as text
    const transcriptText = (record.transcript || [])
      .map((msg: any) => {
        const role = (msg.role === 'agent' || msg.role === 'assistant') ? 'Agente' : 'Usuário';
        return `${role}: ${msg.message || msg.text || msg.content || ''}`;
      })
      .join('\n');

    const playgroundName = (record as any).playgrounds?.name || 'Playground';

    // Build prompt for GPT
    const prompt = `Você é um assistente que cria tasks no ClickUp baseado em dados de curadoria de conversas de agentes de voz.

Dados da conversa:
- Playground: ${playgroundName}
- Conversation ID: ${record.conversation_id}
- Data/Hora: ${record.call_datetime || 'N/A'}
- Duração: ${record.duration_seconds ? Math.floor(record.duration_seconds / 60) + 'min ' + (record.duration_seconds % 60) + 's' : 'N/A'}
- Status da chamada: ${record.call_status || 'N/A'}
- Motivo do encerramento: ${record.call_termination_reason || 'N/A'}

Transcrição:
${transcriptText || 'Não disponível'}

Avaliações dos curadores:
${evaluatorData.map((ev, i) => {
  return `Avaliador ${i + 1} (${ev.email}):\n${ev.answers.map((a: any) => `  - ${a.question}: ${a.answer}`).join('\n')}`;
}).join('\n\n')}

Com base nesses dados, gere uma task para o ClickUp:
1. "name": O nome da task deve seguir o formato "[Curadoria] - " seguido de descrição de no máximo 5 palavras sobre o problema/demanda identificada.
2. "description": A descrição deve ser em Markdown e conter:
   - Resumo das demandas/problemas identificados pelos avaliadores
   - Conversation ID: ${record.conversation_id}
   - Playground ID: ${record.playground_id}
   - Playground: ${playgroundName}
   - Avaliadores (emails): ${evaluatorData.map(e => e.email).join(', ')}
   - Data da conversa: ${record.call_datetime || 'N/A'}
3. "priority": Um número de 1 a 4 (1=urgente, 2=alta, 3=normal, 4=baixa) baseado na gravidade dos problemas identificados.

Responda APENAS com um JSON válido com os campos: name, description, priority. Sem texto adicional.`;

    // Call OpenAI
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 1500,
      }),
    });

    if (!openaiRes.ok) {
      const body = await openaiRes.text();
      console.error('OpenAI error:', body);
      return res.status(500).json({ error: 'Failed to generate task with OpenAI' });
    }

    const openaiData: any = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content || '';

    let taskDraft;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      taskDraft = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (e) {
      console.error('Failed to parse GPT response:', content);
      return res.status(500).json({ error: 'Failed to parse GPT response', raw: content });
    }

    res.json({
      data: {
        name: taskDraft.name || '[Curadoria] - Task',
        description: taskDraft.description || '',
        priority: taskDraft.priority || 3,
        tags: ['curadoria', 'ai.playground'],
        conversation_record_id: conversationRecordId,
        conversation_id: record.conversation_id,
      },
    });
  }),
);

/**
 * POST /curation/create-task/:conversationRecordId
 * Create a task in ClickUp with the provided data.
 * Body: { name, description, priority, tags }
 */
router.post(
  '/create-task/:conversationRecordId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { conversationRecordId } = req.params;
    const { name, description, priority, tags } = req.body;

    // Check conversation exists and doesn't already have a task
    const { data: record, error: recordError } = await supabase
      .from('curation_conversations')
      .select('id, clickup_task_id')
      .eq('id', conversationRecordId)
      .single();

    if (recordError || !record) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (record.clickup_task_id) {
      return res.status(409).json({ error: 'Task already exists for this conversation', clickup_task_id: record.clickup_task_id });
    }

    // Create task in ClickUp
    const clickupRes = await fetch(`${config.clickup.baseUrl}/list/${config.clickup.listId}/task`, {
      method: 'POST',
      headers: {
        'Authorization': config.clickup.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name || '[Curadoria] - Task',
        markdown_content: description || '',
        priority: priority || null,
        tags: tags || ['curadoria', 'ai.playground'],
      }),
    });

    if (!clickupRes.ok) {
      const body = await clickupRes.text();
      console.error('ClickUp create error:', body);
      return res.status(500).json({ error: 'Failed to create task in ClickUp' });
    }

    const clickupTask: any = await clickupRes.json();
    const taskId = clickupTask.id;
    const taskUrl = clickupTask.url;

    // Save task ID and URL to conversation record
    const { error: updateError } = await supabase
      .from('curation_conversations')
      .update({
        clickup_task_id: taskId,
        clickup_task_url: taskUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationRecordId);

    if (updateError) {
      console.error('Error saving clickup task ID:', updateError);
    }

    res.json({
      data: {
        clickup_task_id: taskId,
        clickup_task_url: taskUrl,
        task: clickupTask,
      },
    });
  }),
);

/**
 * GET /curation/task-status/:conversationRecordId
 * Fetch current status of the ClickUp task linked to a conversation.
 */
router.get(
  '/task-status/:conversationRecordId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { conversationRecordId } = req.params;

    const { data: record, error: recordError } = await supabase
      .from('curation_conversations')
      .select('clickup_task_id, clickup_task_url')
      .eq('id', conversationRecordId)
      .single();

    if (recordError || !record) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!record.clickup_task_id) {
      return res.json({ data: null });
    }

    // Fetch task from ClickUp
    const clickupRes = await fetch(`${config.clickup.baseUrl}/task/${record.clickup_task_id}`, {
      headers: {
        'Authorization': config.clickup.apiKey,
      },
    });

    if (!clickupRes.ok) {
      const body = await clickupRes.text();
      console.error('ClickUp task fetch error:', body);
      return res.status(500).json({ error: 'Failed to fetch task from ClickUp' });
    }

    const task: any = await clickupRes.json();

    const priorityId = task.priority?.id ? Number(task.priority.id) : null;

    res.json({
      data: {
        clickup_task_id: task.id,
        clickup_task_url: task.url || record.clickup_task_url,
        status: task.status?.status || 'unknown',
        status_color: task.status?.color || '#d3d3d3',
        name: task.name,
        priority: priorityId,
      },
    });
  }),
);

export default router;