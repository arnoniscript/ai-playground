# Database Schema Documentation

## Tables Overview

### users

Stores all user accounts with role-based access control.

| Column     | Type           | Constraints                           |
| ---------- | -------------- | ------------------------------------- |
| id         | UUID           | PRIMARY KEY                           |
| email      | VARCHAR(255)   | UNIQUE, NOT NULL                      |
| full_name  | VARCHAR(255)   |                                       |
| role       | user_role ENUM | 'admin' or 'tester', default 'tester' |
| created_at | TIMESTAMP      | DEFAULT NOW()                         |
| updated_at | TIMESTAMP      | DEFAULT NOW()                         |
| last_login | TIMESTAMP      |                                       |

**Indexes**: email, role

---

### playgrounds

Main entity for testing projects. Can be A/B testing or Tuning type.

| Column            | Type                 | Constraints                    |
| ----------------- | -------------------- | ------------------------------ |
| id                | UUID                 | PRIMARY KEY                    |
| name              | VARCHAR(255)         | NOT NULL                       |
| type              | playground_type ENUM | 'ab_testing' or 'tuning'       |
| description       | TEXT                 |                                |
| support_text      | TEXT                 | HTML allowed                   |
| created_by        | UUID                 | FK → users.id                  |
| is_active         | BOOLEAN              | default true                   |
| restricted_emails | TEXT[]               | NULL = public to all logged-in |
| created_at        | TIMESTAMP            |                                |
| updated_at        | TIMESTAMP            |                                |

**Indexes**: created_by, is_active

---

### model_configurations

Stores embed code and configuration for AI models (A and B in A/B testing).

| Column          | Type         | Constraints                          |
| --------------- | ------------ | ------------------------------------ |
| id              | UUID         | PRIMARY KEY                          |
| playground_id   | UUID         | FK → playgrounds.id                  |
| model_key       | VARCHAR(50)  | 'model_a' or 'model_b'               |
| model_name      | VARCHAR(255) |                                      |
| embed_code      | TEXT         | Eleven Labs embed script             |
| max_evaluations | INT          | Maximum times model can be evaluated |
| created_at      | TIMESTAMP    |                                      |

**Unique**: (playground_id, model_key)

**Indexes**: playground_id

---

### evaluation_counters

Tracks current evaluation count per model.

| Column        | Type        | Constraints         |
| ------------- | ----------- | ------------------- |
| id            | UUID        | PRIMARY KEY         |
| playground_id | UUID        | FK → playgrounds.id |
| model_key     | VARCHAR(50) |                     |
| current_count | INT         | default 0           |
| created_at    | TIMESTAMP   |                     |
| updated_at    | TIMESTAMP   |                     |

**Unique**: (playground_id, model_key)

**Indexes**: playground_id

---

### questions

Dynamic questions for each model/playground.

| Column        | Type               | Constraints                                      |
| ------------- | ------------------ | ------------------------------------------------ |
| id            | UUID               | PRIMARY KEY                                      |
| playground_id | UUID               | FK → playgrounds.id                              |
| model_key     | VARCHAR(50)        | NULL for tuning (single model)                   |
| question_text | TEXT               | NOT NULL                                         |
| question_type | question_type ENUM | 'select' or 'input_string'                       |
| options       | JSONB              | For 'select': [{"label": "...", "value": "..."}] |
| order_index   | INT                | Display order                                    |
| required      | BOOLEAN            | default true                                     |
| created_at    | TIMESTAMP          |                                                  |

**Indexes**: playground_id, model_key, (playground_id, order_index)

---

### evaluations

Individual responses from testers.

| Column        | Type         | Constraints                         |
| ------------- | ------------ | ----------------------------------- |
| id            | UUID         | PRIMARY KEY                         |
| playground_id | UUID         | FK → playgrounds.id                 |
| user_id       | UUID         | FK → users.id                       |
| model_key     | VARCHAR(50)  |                                     |
| question_id   | UUID         | FK → questions.id                   |
| answer_text   | TEXT         | For 'input_string' questions        |
| answer_value  | VARCHAR(255) | For 'select' questions              |
| rating        | INT          | 1-5, optional                       |
| session_id    | UUID         | Group responses from one evaluation |
| created_at    | TIMESTAMP    |                                     |

**Indexes**: playground_id, user_id, model_key, session_id, created_at

---

### audit_log

Security and activity tracking.

| Column        | Type         | Constraints                    |
| ------------- | ------------ | ------------------------------ |
| id            | UUID         | PRIMARY KEY                    |
| user_id       | UUID         | FK → users.id                  |
| action        | VARCHAR(255) |                                |
| resource_type | VARCHAR(100) | 'playground', 'question', etc. |
| resource_id   | UUID         |                                |
| old_values    | JSONB        | Previous state                 |
| new_values    | JSONB        | New state                      |
| ip_address    | INET         |                                |
| created_at    | TIMESTAMP    |                                |

**Indexes**: user_id, (resource_type, resource_id), created_at

---

## Views

### playground_metrics

Aggregated metrics for dashboard.

```sql
SELECT
  p.id, p.name, p.type,
  COUNT(DISTINCT e.user_id) as total_testers,
  COUNT(e.id) as total_evaluations,
  -- ... more aggregate functions
FROM playgrounds p
LEFT JOIN evaluations e ON p.id = e.playground_id
```

### question_metrics

Response distribution for select questions.

```sql
SELECT
  q.id, q.question_text, q.playground_id, q.model_key,
  e.answer_value,
  COUNT(e.id) as response_count,
  ROUND(100.0 * COUNT(e.id) / SUM(...), 2) as percentage
FROM questions q
LEFT JOIN evaluations e ON q.id = e.question_id
WHERE q.question_type = 'select'
```

### open_responses

All open-ended text responses for analysis.

---

## Key Design Decisions

1. **Evaluation Counters**: Separate table to allow atomic increments and prevent race conditions.

2. **Session ID**: Groups all answers from a single evaluation session (all questions for one model).

3. **Model Key as String**: Flexible for future expansion beyond just A/B.

4. **JSONB for Options**: Flexible structure for question options without schema migration.

5. **RLS Policies**: Row-Level Security configured for multi-tenancy safety:

   - Users see only their own data
   - Admins see their created playgrounds
   - Playgrounds visible based on active status and email restrictions

6. **Audit Log**: All admin actions logged for compliance and debugging.

---

## Data Flow Examples

### A/B Testing Evaluation Flow

1. Admin creates playground with models A and B
2. Evaluation counters created: {playground_id, model_a, 0} and {playground_id, model_b, 0}
3. Tester gets next model (random between A/B)
4. Tester answers questions for that model
5. Evaluations inserted + counter incremented
6. After first submission, tester gets the other model
7. Process repeats until limit reached

### Tuning Flow

1. Admin creates playground with single model
2. Tester answers questions repeatedly
3. System tracks all responses with same model_key
