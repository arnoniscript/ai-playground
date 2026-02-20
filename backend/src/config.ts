import dotenv from 'dotenv';

dotenv.config();

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || '',
    allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN || 'marisa.care',
  },
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    baseUrl: process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io',
    agentIds: (process.env.ELEVENLABS_AGENT_IDS || '').split(',').filter(Boolean),
    insightsEndpoint: process.env.ELEVENLABS_INSIGHTS_ENDPOINT_TEMPLATE || '/v1/convai/analytics/live-count',
    callsEndpoint: process.env.ELEVENLABS_CALLS_ENDPOINT_TEMPLATE || '/v1/convai/conversations',
    callDetailEndpoint: process.env.ELEVENLABS_CALL_DETAIL_ENDPOINT_TEMPLATE || '/v1/convai/conversations/{conversation_id}',
  },
};

export function validateConfig() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'JWT_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
