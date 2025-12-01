# API Endpoints Documentation

## Authentication

### POST /auth/signup

Request OTP code for login

```json
{
  "email": "usuario@marisa.care"
}
```

Response:

```json
{
  "message": "OTP sent to email",
  "email": "usuario@marisa.care",
  "otp": "123456" // Only in development
}
```

### POST /auth/verify

Verify OTP and get JWT token

```json
{
  "email": "usuario@marisa.care",
  "code": "123456"
}
```

Response:

```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "usuario@marisa.care",
    "role": "tester",
    "full_name": null
  }
}
```

### POST /auth/logout

Logout (stateless)

## Admin Routes (requires admin role)

### GET /admin/playgrounds

List all playgrounds

### GET /admin/playgrounds/:id

Get playground details with models, questions, and counters

### POST /admin/playgrounds

Create new playground with models and questions

Request:

```json
{
  "name": "Chatbot A/B Test",
  "type": "ab_testing",
  "description": "Comparing two chatbot approaches",
  "support_text": "<h3>Instruciones</h3>",
  "models": [
    {
      "model_key": "model_a",
      "model_name": "Model A",
      "embed_code": "<elevenlabs-convai...></elevenlabs-convai>",
      "max_evaluations": 100
    },
    {
      "model_key": "model_b",
      "model_name": "Model B",
      "embed_code": "<elevenlabs-convai...></elevenlabs-convai>",
      "max_evaluations": 100
    }
  ],
  "questions": [
    {
      "model_key": "model_a",
      "question_text": "Was the response helpful?",
      "question_type": "select",
      "options": [
        { "label": "Yes", "value": "yes" },
        { "label": "No", "value": "no" }
      ],
      "order_index": 0,
      "required": true
    },
    {
      "model_key": "model_a",
      "question_text": "Additional comments",
      "question_type": "input_string",
      "order_index": 1,
      "required": false
    }
  ],
  "restricted_emails": null // null = all, ["email@marisa.care"] = specific
}
```

### PUT /admin/playgrounds/:id

Update playground

### DELETE /admin/playgrounds/:id

Delete playground

### GET /admin/playgrounds/:id/metrics

Get dashboard metrics

Response:

```json
{
  "data": {
    "counters": [
      {
        "playground_id": "uuid",
        "model_key": "model_a",
        "current_count": 45,
        "max_evaluations": 100
      }
    ],
    "selectMetrics": [
      {
        "question_id": "uuid",
        "question_text": "Was helpful?",
        "answer_value": "yes",
        "response_count": 35,
        "percentage": 77.78
      }
    ],
    "openResponses": [
      {
        "question_id": "uuid",
        "answer_text": "Great response!",
        "user_id": "uuid",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "stats": {
      "totalEvaluations": 45,
      "uniqueTesters": 12,
      "status": "in_progress"
    }
  }
}
```

## Tester Routes

### GET /playgrounds

List available playgrounds for tester

### GET /playgrounds/:id

Get playground details with models and questions

### POST /playgrounds/:id/evaluations

Submit evaluation responses

Request:

```json
{
  "session_id": "uuid",
  "model_key": "model_a",
  "answers": [
    {
      "question_id": "uuid",
      "answer_value": "yes"
    },
    {
      "question_id": "uuid",
      "answer_text": "Great interaction"
    }
  ]
}
```

Response:

```json
{
  "message": "Evaluation submitted successfully",
  "session_id": "uuid"
}
```

### GET /playgrounds/:id/next-model

Get next model to evaluate (random for A/B)

Response:

```json
{
  "data": {
    "model_key": "model_b"
  }
}
```

### GET /playgrounds/:id/progress

Get user's evaluation progress

Response:

```json
{
  "data": {
    "progress": {
      "model_a": 3,
      "model_b": 3
    },
    "total": 6
  }
}
```

## Error Responses

```json
{
  "error": "Error message",
  "details": [] // Only for validation errors
}
```

### Common Status Codes

- 200: Success
- 201: Created
- 400: Validation error
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 409: Conflict (e.g., limit reached)
- 500: Server error
