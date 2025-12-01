# Instruções de Início Rápido

Este projeto é uma plataforma de testes para modelos de IA conversacional da Eleven Labs.

## ⚙️ Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta Supabase (gratuita)
- Conta Vercel (gratuita)

## 🚀 Início Local

### 1. Clone e Configure

```bash
# Backend
cd backend
npm install
cp .env.example .env.local
# Preencha as variáveis de ambiente
npm run dev
```

```bash
# Frontend (novo terminal)
cd frontend
npm install
cp .env.example .env.local
# Preencha as variáveis de ambiente
npm run dev
```

### 2. Acesse

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Health: http://localhost:3001/health

### 3. Teste

1. Clique em "Entrar no Sistema"
2. Digite `teste@marisa.care`
3. Copie o OTP dos logs do backend
4. Cole no frontend

## 📊 Fluxo do Sistema

### Admin

1. Login com email @marisa.care
2. Sistema atribui role 'admin'
3. Acessa `/admin/dashboard`
4. Cria playgrounds (A/B ou Tuning)
5. Define perguntas customizadas
6. Vê métricas em tempo real

### Tester

1. Login com email @marisa.care
2. Sistema atribui role 'tester'
3. Acessa `/dashboard`
4. Vê playgrounds disponíveis
5. Abre playground
6. Responde perguntas
7. Para A/B: sistema alterna entre modelos automaticamente

## 🗄️ Banco de Dados

### Supabase

1. Crie projeto em supabase.com
2. Copie a SQL migration: `supabase/migrations/001_initial_schema.sql`
3. Execute no SQL Editor do Supabase

### Estrutura

```
users → playgrounds
      → model_configurations
      → questions
      → evaluations ← evaluation_counters
      → audit_log
```

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── main.ts              # Servidor Express
│   ├── config.ts            # Configurações
│   ├── types.ts             # Tipos compartilhados
│   ├── db/
│   │   └── client.ts        # Cliente Supabase
│   ├── middleware/
│   │   ├── auth.ts          # Auth middleware
│   │   └── errorHandler.ts  # Error handler
│   ├── routes/
│   │   ├── auth.ts          # /auth/*
│   │   ├── admin.ts         # /admin/*
│   │   └── playgrounds.ts   # /playgrounds/*
│   ├── schemas/
│   │   └── index.ts         # Zod schemas
│   └── utils/
│       └── auth.ts          # Auth utilities
├── package.json
└── .env.example

frontend/
├── app/
│   ├── page.tsx             # Home
│   ├── login/
│   │   └── page.tsx         # Login
│   ├── dashboard/
│   │   └── page.tsx         # Tester dashboard
│   ├── admin/
│   │   └── dashboard/
│   │       └── page.tsx     # Admin dashboard
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Tailwind
├── components/
│   ├── layout.tsx           # Layout com nav
│   ├── login-form.tsx       # Form OTP
│   └── auth-guard.tsx       # Proteção de rotas
├── lib/
│   ├── api.ts              # Axios client
│   ├── auth-store.ts       # Zustand auth store
│   └── types.ts            # Types compartilhados
├── package.json
└── .env.example

docs/
├── database-schema.md      # Documentação banco
├── api-endpoints.md        # Documentação API
├── auth-flow.md            # Fluxo autenticação
└── setup-deployment.md     # Deploy

supabase/
└── migrations/
    └── 001_initial_schema.sql  # Schema SQL
```

## 🔑 Variáveis de Ambiente

### Backend (.env.local)

```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-chave-de-serviço
JWT_SECRET=sua-chave-secreta-aleatória
ALLOWED_EMAIL_DOMAIN=marisa.care
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

## 📝 API Principais

### Autenticação

- `POST /auth/signup` - Enviar OTP
- `POST /auth/verify` - Verificar OTP
- `POST /auth/logout` - Logout

### Admin (requer role admin)

- `GET /admin/playgrounds` - Listar playgrounds
- `POST /admin/playgrounds` - Criar playground
- `GET /admin/playgrounds/:id/metrics` - Métricas

### Tester

- `GET /playgrounds` - Listar disponíveis
- `GET /playgrounds/:id` - Detalhes
- `POST /playgrounds/:id/evaluations` - Submeter resposta

Ver `docs/api-endpoints.md` para detalhes completos.

## 🎯 Recursos Implementados

✅ Autenticação OTP com validação de domínio
✅ Dois roles (admin/tester) com RBAC
✅ Schema PostgreSQL com 7 tabelas
✅ Backend REST completo
✅ Frontend Next.js base
✅ Suporte A/B testing com sorteio aleatório
✅ Limite de avaliações por modelo
✅ Dashboard admin (estrutura)
✅ Dashboard tester (estrutura)
✅ Documentação completa

## 📚 Próximos Passos

1. **Implementar componentes avançados**

   - Formulário dinâmico de questões
   - Dashboard de métricas com gráficos
   - Builder de playgrounds (admin)

2. **Integração com Eleven Labs**

   - Renderizar scripts embarcados
   - Validação de interação com modelo

3. **Melhorias**

   - Email real (SendGrid)
   - Redis para OTP distribuído
   - Rate limiting
   - Testes unitários

4. **Produção**
   - Deploy Vercel (backend + frontend)
   - CI/CD GitHub Actions
   - Monitoring e logs

## 🐛 Troubleshooting

### CORS errors

```
Check: CORS_ORIGIN no backend == frontend URL
```

### "Module not found" errors

```
Frontend/Backend: npm install
```

### Token inválido

```
Limpe localStorage no browser
Gere novo token com login
```

### Banco não conecta

```
Verifique SUPABASE_URL e SUPABASE_SERVICE_KEY
Teste conexão no Supabase dashboard
```

## 📞 Suporte

Veja a documentação em `/docs`:

- `auth-flow.md` - Fluxo de autenticação
- `database-schema.md` - Estrutura do banco
- `api-endpoints.md` - Endpoints disponíveis
- `setup-deployment.md` - Deploy e produção

## 📄 Licença

MIT
