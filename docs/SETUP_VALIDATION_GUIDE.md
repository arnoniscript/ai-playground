# 🔍 Guia Completo de Setup e Validação - AI Marisa Playground

## 📋 Índice

1. [Setup do Banco de Dados](#setup-do-banco-de-dados)
2. [Criar Usuário Admin](#criar-usuário-admin)
3. [Validar Backend](#validar-backend)
4. [Validar Frontend](#validar-frontend)
5. [Fluxo Completo](#fluxo-completo)
6. [Troubleshooting](#troubleshooting)

---

## Setup do Banco de Dados

### 1. Executar Migrations

```bash
# No Supabase SQL Editor, execute:
/Users/luizarnoni/ai-marisa-playground/supabase/migrations/001_initial_schema.sql
```

### 2. Verificar Tabelas Criadas

```sql
-- Verificar se todas as tabelas existem
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Deve retornar:
-- audit_log
-- evaluation_counters
-- evaluations
-- model_configurations
-- playgrounds
-- questions
-- users
```

### 3. Verificar Views

```sql
-- Verificar se as views existem
SELECT viewname FROM pg_views
WHERE schemaname = 'public';

-- Deve retornar:
-- open_responses
-- playground_metrics
-- question_metrics
```

---

## Criar Usuário Admin

### Opção 1: Via Supabase SQL Editor

```sql
-- Substituir pelo seu email
INSERT INTO users (email, role, full_name)
VALUES ('seu-email@marisa.care', 'admin', 'Seu Nome')
ON CONFLICT (email)
DO UPDATE SET role = 'admin';
```

### Opção 2: Via Script Fornecido

```bash
# Edite o arquivo e execute no Supabase
supabase/create-admin.sql
```

### Verificar Admin Criado

```sql
SELECT id, email, role, full_name, created_at
FROM users
WHERE role = 'admin';
```

**✅ Deve retornar seu usuário com role = 'admin'**

---

## Validar Backend

### 1. Verificar Variáveis de Ambiente

```bash
cd backend
cat .env
```

Deve conter:

```env
# Database
SUPABASE_URL=https://ixfvrgszjopmaxpbzlhb.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (opcional)

# Auth
JWT_SECRET=your-secret-key-min-32-chars
ALLOWED_EMAIL_DOMAIN=marisa.care

# Email
RESEND_API_KEY=re_xxxxxxxxxx
EMAIL_FROM=onboarding@resend.dev

# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 2. Iniciar Backend

```bash
cd backend
npm install
npm run dev
```

**✅ Deve aparecer**: `Server running on port 3001 (development)`

### 3. Testar Health Check

```bash
curl http://localhost:3001/health
```

**✅ Resposta esperada**:

```json
{
  "status": "ok",
  "timestamp": "2024-11-30T..."
}
```

### 4. Testar Signup (criar OTP)

```bash
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marisa.care"}'
```

**✅ Resposta esperada**:

```json
{
  "message": "OTP sent to email",
  "email": "admin@marisa.care",
  "otp": "123456"
}
```

**✅ No terminal do backend deve aparecer**: `OTP for admin@marisa.care: 123456`

### 5. Testar Verify (obter token)

```bash
curl -X POST http://localhost:3001/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marisa.care", "code":"123456"}'
```

**✅ Resposta esperada**:

```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "admin@marisa.care",
    "role": "admin",
    "full_name": "Seu Nome"
  }
}
```

**⚠️ IMPORTANTE**: Copie o `token` para os próximos testes!

### 6. Testar Endpoints Admin

```bash
# Substituir YOUR_TOKEN pelo token copiado
TOKEN="eyJhbGc..."

# Listar playgrounds
curl http://localhost:3001/admin/playgrounds \
  -H "Authorization: Bearer $TOKEN"
```

**✅ Resposta esperada**: `{"data":[]}`

---

## Validar Frontend

### 1. Verificar Variáveis de Ambiente

```bash
cd frontend
cat .env.local
```

Deve conter:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 2. Iniciar Frontend

```bash
cd frontend
npm install
npm run dev
```

**✅ Deve aparecer**: `Ready on http://localhost:3000`

### 3. Estrutura de Rotas

Verifique se essas pastas existem:

```
frontend/app/
├── login/page.tsx                    ✅ Login
├── dashboard/page.tsx                ✅ Dashboard tester
├── playground/[id]/page.tsx          ✅ Avaliar playground
└── admin/
    ├── page.tsx                      ✅ Redireciona para dashboard
    ├── dashboard/page.tsx            ✅ Dashboard admin
    ├── create-playground/page.tsx    ✅ Criar playground
    └── playground/[id]/
        ├── page.tsx                  ✅ Editar playground
        └── metrics/page.tsx          ✅ Métricas
```

---

## Fluxo Completo

### Fluxo Admin (Criar Playground)

1. **Abrir navegador**: http://localhost:3000
2. **Fazer Login**:

   - Ir para `/login`
   - Digitar: `admin@marisa.care`
   - Clicar em "Enviar Código"
   - Verificar console do backend para ver OTP
   - Digitar OTP e clicar "Verificar"
   - ✅ Deve redirecionar para `/dashboard` ou `/admin/dashboard`

3. **Verificar Role**:

   - Abrir DevTools → Console
   - Digitar: `JSON.parse(localStorage.getItem('user'))`
   - ✅ Deve mostrar: `{ ..., role: "admin" }`

4. **Acessar Admin**:

   - Ir para `/admin` ou `/admin/dashboard`
   - ✅ Deve ver "Dashboard Admin"
   - ✅ Botão "+ Novo Playground"

5. **Criar Playground**:

   - Clicar em "+ Novo Playground"
   - Preencher formulário:
     - Nome: `Teste Atendimento 01`
     - Tipo: `Teste A/B`
     - Descrição: `Testar qualidade`
     - Modelos (mínimo 2):
       - Chave: `model_a`
       - Código: `<elevenlabs-convai agent-id="..."></elevenlabs-convai>`
     - Perguntas (mínimo 1):
       - Texto: `Como você avalia?`
       - Tipo: `Múltipla Escolha`
       - Opções: `Excelente`, `Bom`, `Regular`
   - Clicar "Criar Playground"
   - ✅ Deve redirecionar para `/admin/playground/{id}`

6. **Verificar Playground Criado**:
   - ✅ Ver detalhes do playground
   - ✅ Botão "Ativar/Desativar"
   - ✅ Botão "Ver Métricas"
   - ✅ Link copiável

### Fluxo Tester (Avaliar)

1. **Fazer Logout** (se admin):
   - Ir para `/logout` ou limpar localStorage
2. **Fazer Login como Tester**:

   - Email: `tester@marisa.care`
   - Criar OTP e verificar
   - ✅ Role deve ser `tester`

3. **Ver Playgrounds Disponíveis**:

   - Ir para `/dashboard`
   - ✅ Ver lista de playgrounds ativos

4. **Avaliar Playground**:

   - Clicar em um playground
   - ✅ Ver widget Eleven Labs
   - ✅ Ver formulário de perguntas
   - Preencher respostas
   - Clicar "Enviar Avaliação"
   - Para A/B: Avaliar segundo modelo
   - ✅ Redirecionar para conclusão

5. **Admin Ver Métricas**:
   - Voltar como admin
   - Ir para `/admin/playground/{id}/metrics`
   - ✅ Ver total de avaliações
   - ✅ Ver gráficos
   - ✅ Ver respostas

---

## Troubleshooting

### Problema: 404 em `/admin/playgrounds`

**Causa**: Rota não existe no Next.js. A rota correta é `/admin/dashboard`

**Solução**: Acessar `/admin` ou `/admin/dashboard`

---

### Problema: "Admin access required"

**Causa**: Usuário não tem role de admin no banco

**Solução**:

```sql
-- Verificar role
SELECT email, role FROM users WHERE email = 'seu-email@marisa.care';

-- Atualizar para admin
UPDATE users SET role = 'admin' WHERE email = 'seu-email@marisa.care';
```

---

### Problema: Email não chega

**Causa**: Resend API Key inválida ou não configurada

**Solução**:

1. Verificar `.env`:

   ```bash
   RESEND_API_KEY=re_xxxxxxxxxx
   EMAIL_FROM=onboarding@resend.dev
   ```

2. Em desenvolvimento, OTP aparece no console do backend

3. Usar sandbox domain: `onboarding@resend.dev` (não precisa verificação)

---

### Problema: Token inválido

**Causa**: JWT_SECRET mudou ou token expirou (7 dias)

**Solução**:

1. Fazer logout
2. Fazer login novamente
3. Verificar JWT_SECRET no `.env` (mínimo 32 caracteres)

---

### Problema: CORS error

**Causa**: Backend não aceita requisições do frontend

**Solução**:

```bash
# backend/.env
CORS_ORIGIN=http://localhost:3000
```

---

### Problema: Playground não cria

**Causa**: Formato de dados incorreto ou token sem permissão

**Solução**:

1. Verificar no DevTools → Network → Payload
2. Deve enviar para `/admin/playgrounds` (não `/playgrounds`)
3. Deve incluir `models` e `questions` no body
4. Token deve ter role `admin`

---

## ✅ Checklist Final

### Backend

- [ ] Migrations executadas
- [ ] Tabelas criadas (7 tabelas)
- [ ] Views criadas (3 views)
- [ ] Admin criado no banco
- [ ] Backend rodando (porta 3001)
- [ ] Health check OK
- [ ] Signup funciona (OTP gerado)
- [ ] Verify funciona (token retornado)
- [ ] Token tem role correto

### Frontend

- [ ] Frontend rodando (porta 3000)
- [ ] Login funciona
- [ ] Role salva no localStorage
- [ ] Admin vê dashboard admin
- [ ] Tester vê dashboard tester
- [ ] Criar playground funciona
- [ ] Editar playground funciona
- [ ] Ver métricas funciona
- [ ] Avaliar playground funciona

### Endpoints Admin

- [ ] GET /admin/playgrounds
- [ ] GET /admin/playgrounds/:id
- [ ] POST /admin/playgrounds
- [ ] PUT /admin/playgrounds/:id
- [ ] DELETE /admin/playgrounds/:id
- [ ] GET /admin/playgrounds/:id/metrics

### Endpoints Tester

- [ ] GET /playgrounds
- [ ] GET /playgrounds/:id
- [ ] POST /playgrounds/:id/evaluations
- [ ] GET /playgrounds/:id/next-model

---

## 📞 Suporte

Se algo não funcionar:

1. **Verificar logs do backend**: Erros aparecem no terminal
2. **Verificar Network no DevTools**: Ver requisições e respostas
3. **Verificar Console no DevTools**: Ver erros JavaScript
4. **Verificar banco de dados**: Executar queries de verificação

---

**Última atualização**: 30 de Novembro, 2024
**Desenvolvido por**: GitHub Copilot & Luiz Arnoni
