# Setup & Deployment Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Vercel account
- GitHub repository

## Backend Setup

### 1. Create Supabase Project

1. Go to https://supabase.com and create a new project
2. Note your project URL and service key (for backend)
3. Also generate an anon key for frontend

### 2. Create Database Schema

```bash
cd supabase
# Copy the migration file to your Supabase project via the web interface
# Or use Supabase CLI:
# supabase db push
```

Navigate to Supabase SQL editor and run `migrations/001_initial_schema.sql`

### 3. Setup Backend Environment

```bash
cd backend
cp .env.example .env.local
```

Fill in `.env.local`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-random-secret-key
ALLOWED_EMAIL_DOMAIN=marisa.care
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 4. Install Dependencies & Run

```bash
npm install
npm run dev
```

Server should run on http://localhost:3001

Test with:

```bash
curl http://localhost:3001/health
# Response: {"status":"ok","timestamp":"..."}
```

## Frontend Setup

### 1. Setup Frontend Environment

```bash
cd frontend
cp .env.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Install Dependencies & Run

```bash
npm install
npm run dev
```

Frontend should run on http://localhost:3000

## Local Development

### Terminal 1: Backend

```bash
cd backend
npm run dev
```

### Terminal 2: Frontend

```bash
cd frontend
npm run dev
```

### Test Flow

1. Go to http://localhost:3000
2. Click "Entrar no Sistema"
3. Enter email like `test@marisa.care`
4. Copy OTP from backend logs (development mode)
5. Paste OTP in frontend
6. Should redirect to dashboard

## Database Seeding (Optional)

Create `supabase/seed.sql`:

```sql
-- Create test users
INSERT INTO users (email, role) VALUES
('admin@marisa.care', 'admin'),
('tester1@marisa.care', 'tester'),
('tester2@marisa.care', 'tester');

-- Create test playground
INSERT INTO playgrounds (name, type, description, created_by) VALUES
('Test A/B Playground', 'ab_testing', 'Demo for testing', (SELECT id FROM users WHERE email='admin@marisa.care'));
```

## Production Deployment

### Backend: Deploy to Vercel Functions

1. Push code to GitHub
2. In Vercel: Add new project from GitHub
3. Set environment variables from `.env.example`
4. Select `backend` as root directory
5. Deploy

Backend URL: `https://your-project-name.vercel.app`

### Frontend: Deploy to Vercel

1. Create new Vercel project from GitHub
2. Set `NEXT_PUBLIC_API_URL` to your backend URL
3. Set Supabase environment variables
4. Select `frontend` as root directory
5. Deploy

### Environment Variables for Production

**Backend (.env in Vercel)**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-strong-secret-key
ALLOWED_EMAIL_DOMAIN=marisa.care
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

**Frontend (.env in Vercel)**

```
NEXT_PUBLIC_API_URL=https://your-backend-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Update CORS

In Supabase, ensure your frontend domain is added to CORS whitelist.

## CI/CD (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Monitoring & Logs

### Backend Logs

- Vercel: Dashboard > Deployments > Function Logs
- Local: Check terminal output

### Frontend Logs

- Vercel: Dashboard > Deployments > Build & Runtime Logs
- Local: Browser DevTools

### Database Logs

- Supabase: SQL Editor or API Logs

## Email Service Integration

Currently uses console.log for OTP. To send real emails:

### Option 1: SendGrid

```bash
npm install @sendgrid/mail
```

```typescript
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: email,
  from: "noreply@marisa.care",
  subject: "Seu código de acesso",
  html: `<h1>Código: ${otp}</h1>`,
});
```

### Option 2: AWS SES

```bash
npm install @aws-sdk/client-ses
```

## Troubleshooting

### 502 Bad Gateway

- Check backend service is running
- Verify API URL in frontend env

### CORS Errors

- Check `CORS_ORIGIN` in backend matches frontend URL
- Verify Supabase CORS settings

### OTP Not Arriving

- Check email integration is configured
- Review backend logs for errors

### Token Verification Fails

- Ensure JWT_SECRET matches between requests
- Check token hasn't expired

## Scaling Considerations

### Current Limitations

- In-memory OTP store (not distributed)
- Single backend instance

### For Production Growth

1. Move OTP to Redis
2. Deploy backend with horizontal scaling
3. Add caching layer (Redis)
4. Consider GraphQL for complex queries
5. Implement rate limiting

## Backup & Recovery

### Database Backup

- Supabase auto-backups (check plan)
- Manual backup: `supabase db dump`

### Data Export

```bash
# Export evaluations for analysis
SELECT * FROM evaluations
WHERE playground_id = 'xxx'
ORDER BY created_at DESC
```
