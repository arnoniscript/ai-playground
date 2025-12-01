# 🛠️ Development Guide - AI Marisa Playground

## Quick Start

### Terminal 1 - Backend

```bash
cd backend
npm run dev
# Output: Server running on port 3001 (development)
```

### Terminal 2 - Frontend

```bash
cd frontend
nvm use 22
npm run dev
# Output: http://localhost:3000
```

## API Endpoints

### Authentication

- `POST /auth/signup` - Send OTP to email
- `POST /auth/verify` - Verify OTP and get JWT
- `POST /auth/logout` - Logout

### Admin Routes

- `GET /admin/playgrounds` - List all playgrounds
- `POST /admin/playgrounds` - Create playground
- `PUT /admin/playgrounds/:id` - Update playground
- `DELETE /admin/playgrounds/:id` - Delete playground
- `GET /admin/playgrounds/:id/metrics` - Get metrics

### Tester Routes

- `GET /playgrounds` - List available playgrounds
- `GET /playgrounds/:id` - Get playground details
- `POST /playgrounds/:id/evaluations` - Submit evaluation
- `GET /playgrounds/:id/next-model` - Get next model to test

## Database Setup

1. Create Supabase project at https://supabase.com
2. Get credentials (URL and Service Key)
3. Add to `.env` file
4. Execute SQL in `supabase/migrations/001_initial_schema.sql`
5. Restart backend

## Testing OTP Login

1. Open http://localhost:3000
2. Click "Entrar no Sistema"
3. Enter email like `test@marisa.care`
4. Check browser console for OTP code (in development)
5. Enter OTP in form
6. Login successful!

## Common Issues

### "Server already in use"

```bash
# Kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill -9
# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

### Node version issues

```bash
# For backend (v18+)
nvm use 18
# For frontend (v22)
nvm use 22
```

### Database connection error

- Check `.env` has valid SUPABASE_URL and SUPABASE_SERVICE_KEY
- Verify database exists and is accessible
- Check RLS policies are not blocking access

### "Module not found" errors

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

## Code Structure

### Backend (Express + TypeScript)

```
src/
├── main.ts           # Server setup
├── config.ts         # Config loading
├── types.ts          # Type definitions
├── routes/           # API routes
├── middleware/       # Auth, error handling
├── db/               # Database client
├── schemas/          # Zod validation
└── utils/            # Helper functions
```

### Frontend (Next.js + React)

```
app/
├── page.tsx          # Home page
├── login/            # Login page
├── dashboard/        # Tester dashboard
├── admin/            # Admin pages
└── layout.tsx        # Root layout

components/
├── login-form        # OTP login component
├── layout            # Navigation layout
└── auth-guard        # Route protection

lib/
├── api.ts            # API client
├── auth-store.ts     # Zustand store
└── types.ts          # Type definitions
```

## Environment Variables

### Backend (.env)

```
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET=your_secret_key
ALLOWED_EMAIL_DOMAIN=marisa.care
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Building for Production

### Backend

```bash
npm run build
npm start
```

### Frontend

```bash
npm run build
npm start
# Output: opened on http://localhost:3000
```

## Database Schema

### Tables

- `users` - User accounts with roles
- `playgrounds` - A/B tests and tuning experiments
- `model_configurations` - Models per playground
- `evaluation_counters` - Fairness tracking
- `questions` - Custom questions per model
- `evaluations` - User responses
- `audit_log` - Security tracking

### Views

- `playground_metrics` - Aggregated stats
- `question_metrics` - Response distribution
- `open_responses` - Free-text answers

## Deployment

### Vercel (Frontend)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy

### Vercel Functions (Backend)

1. Convert Express to Vercel Functions
2. Update database connection strings
3. Deploy

### Supabase (Database)

- Already hosted
- Just ensure RLS policies are correct
- Monitor query logs in dashboard

## Next Features to Implement

- [ ] Email OTP delivery (SendGrid/Resend)
- [ ] Playground builder UI
- [ ] Evaluation form builder
- [ ] Metrics dashboard with charts
- [ ] Response export (CSV/JSON)
- [ ] Rate limiting
- [ ] Two-factor authentication
- [ ] Admin user management
- [ ] Playground templates
- [ ] Model performance comparison

## Performance Tips

1. Implement caching for playgrounds list
2. Paginate evaluation results
3. Use database indexes on frequently queried columns
4. Consider CDN for static assets
5. Implement request rate limiting

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Use Supabase RLS policies
- [ ] Enable HTTPS in production
- [ ] Add rate limiting
- [ ] Validate all inputs with Zod
- [ ] Use CORS whitelist properly
- [ ] Rotate database credentials regularly
- [ ] Enable audit logging
- [ ] Add monitoring and alerts

---

For more information, see:

- README.md - Project overview
- PROJECT_SUMMARY.txt - Technical details
- docs/api-endpoints.md - Full API reference
- docs/database-schema.md - Database details
