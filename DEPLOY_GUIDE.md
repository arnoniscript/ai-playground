# 🚀 Guia de Deploy - Vercel + Supabase

## 📋 Opções de Deploy

Você tem 2 opções para o backend:

### **Opção 1: Vercel Serverless (Recomendado para MVP)**

- ✅ Mais simples
- ✅ Gratuito
- ✅ Integrado com frontend
- ⚠️ Limitações de tempo de execução (10s no free tier)

### **Opção 2: Railway/Render (Recomendado para Produção)**

- ✅ Backend Express completo
- ✅ Sem limitações de tempo
- ✅ WebSocket support
- 💰 Pode ter custos

---

## 🎯 Deploy Opção 1: Vercel (Frontend + Backend Serverless)

### Passo 1: Preparar Repositório Git

```bash
cd /Users/luizarnoni/ai-marisa-playground

# Inicializar git (se ainda não fez)
git init
git add .
git commit -m "Initial commit - AI Marisa Playground"

# Criar repositório no GitHub
# Ir para: https://github.com/new
# Nome: ai-marisa-playground

# Adicionar remote e push
git remote add origin https://github.com/SEU-USUARIO/ai-marisa-playground.git
git branch -M main
git push -u origin main
```

### Passo 2: Deploy na Vercel

1. **Acessar Vercel**: https://vercel.com
2. **Fazer login** com GitHub
3. **Clicar em "Add New Project"**
4. **Importar** seu repositório `ai-marisa-playground`
5. **Configurar**:

   - Framework Preset: **Next.js**
   - Root Directory: **frontend**
   - Build Command: `npm run build`
   - Output Directory: `.next`

6. **Environment Variables** (clicar em "Environment Variables"):

   ```
   NEXT_PUBLIC_API_URL=https://seu-projeto.vercel.app/api
   ```

7. **Clicar em "Deploy"**

### Passo 3: Configurar Variáveis de Ambiente do Backend

Após o primeiro deploy, adicionar mais variáveis:

```
# Database
SUPABASE_URL=https://ixfvrgszjopmaxpbzlhb.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...seu-key-completa

# Auth
JWT_SECRET=seu-secret-muito-seguro-min-32-chars
ALLOWED_EMAIL_DOMAIN=marisa.care

# Email
RESEND_API_KEY=re_xxxxxxxxxx
EMAIL_FROM=onboarding@resend.dev

# Server
NODE_ENV=production
```

### Passo 4: Redesploy

Após adicionar variáveis, fazer redeploy:

- Ir em "Deployments"
- Clicar nos 3 pontos do último deploy
- "Redeploy"

---

## 🎯 Deploy Opção 2: Railway (Backend Express) + Vercel (Frontend)

### Backend no Railway

1. **Acessar Railway**: https://railway.app
2. **Fazer login** com GitHub
3. **New Project** → **Deploy from GitHub repo**
4. **Selecionar** `ai-marisa-playground`
5. **Configurar**:

   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

6. **Environment Variables**:

   ```
   SUPABASE_URL=https://ixfvrgszjopmaxpbzlhb.supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...
   JWT_SECRET=seu-secret-seguro
   ALLOWED_EMAIL_DOMAIN=marisa.care
   RESEND_API_KEY=re_xxx
   EMAIL_FROM=onboarding@resend.dev
   PORT=3001
   NODE_ENV=production
   CORS_ORIGIN=https://seu-app.vercel.app
   ```

7. **Deploy** → Copiar a URL gerada (ex: `https://ai-marisa-backend.up.railway.app`)

### Frontend na Vercel

1. **Vercel Dashboard** → **Add New Project**
2. **Import** `ai-marisa-playground`
3. **Configure**:

   - Root Directory: `frontend`
   - Framework: Next.js

4. **Environment Variables**:

   ```
   NEXT_PUBLIC_API_URL=https://ai-marisa-backend.up.railway.app
   ```

5. **Deploy**

---

## 🔧 Ajustes Necessários no Código

### 1. Criar Script de Build para Backend

Criar `backend/package.json` (adicionar):

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/main.js",
    "dev": "tsx watch src/main.ts"
  }
}
```

### 2. Configurar CORS para Produção

Arquivo já configurado! ✅

O `backend/src/main.ts` já tem:

```typescript
cors({
  origin: config.cors.origin, // Lê de CORS_ORIGIN
  credentials: true,
});
```

### 3. Atualizar URL da API no Frontend

Criar `frontend/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://seu-backend-url
```

---

## 📝 Checklist de Deploy

### Pré-Deploy

- [ ] Código commitado no Git
- [ ] Repositório criado no GitHub
- [ ] Código pushed para GitHub
- [ ] Migrations executadas no Supabase
- [ ] Admin criado no banco
- [ ] Resend API Key obtida
- [ ] JWT Secret gerado (32+ chars)

### Backend (Railway/Render)

- [ ] Projeto criado
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado com sucesso
- [ ] URL do backend copiada
- [ ] Health check funcionando: `https://seu-backend.app/health`

### Frontend (Vercel)

- [ ] Projeto importado
- [ ] Root directory = `frontend`
- [ ] NEXT_PUBLIC_API_URL configurada
- [ ] Deploy realizado
- [ ] Site acessível

### Validação

- [ ] Login funciona em produção
- [ ] Admin consegue criar playground
- [ ] Tester consegue avaliar
- [ ] Métricas aparecem
- [ ] Email OTP funciona

---

## 🧪 Testar em Produção

### 1. Testar Backend

```bash
# Health check
curl https://seu-backend.railway.app/health

# Signup
curl -X POST https://seu-backend.railway.app/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marisa.care"}'
```

### 2. Testar Frontend

1. Acessar: `https://seu-app.vercel.app`
2. Fazer login
3. Verificar role no localStorage
4. Criar playground (admin)
5. Avaliar playground (tester)

---

## 🐛 Troubleshooting

### "Failed to fetch" no frontend

- Verificar CORS_ORIGIN no backend inclui URL da Vercel
- Verificar NEXT_PUBLIC_API_URL está correto

### "Internal Server Error" no backend

- Verificar logs no Railway/Render
- Verificar variáveis de ambiente

### Build falha no Vercel

- Verificar `frontend/package.json` tem script "build"
- Verificar Node version (usar 18+)

### Email não funciona

- Verificar RESEND_API_KEY está configurada
- Usar domínio sandbox: `onboarding@resend.dev`

---

## 💰 Custos Estimados

### Grátis (Free Tier)

- ✅ Vercel: Até 100GB bandwidth
- ✅ Supabase: Até 500MB database
- ✅ Railway: $5 crédito grátis/mês
- ✅ Resend: 100 emails/dia grátis

### Pago (Se necessário)

- Vercel Pro: $20/mês (mais bandwidth)
- Railway: ~$5-10/mês (backend)
- Supabase Pro: $25/mês (mais storage)
- Resend: $20/mês (50k emails)

---

## 🔗 Links Úteis

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Railway Dashboard**: https://railway.app/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Resend Dashboard**: https://resend.com/emails

---

## 📞 Comandos Rápidos

### Deploy Frontend (Vercel CLI)

```bash
npm i -g vercel
cd frontend
vercel --prod
```

### Deploy Backend (Railway CLI)

```bash
npm i -g @railway/cli
cd backend
railway login
railway up
```

### Ver Logs

```bash
# Vercel
vercel logs

# Railway
railway logs
```

---

**Recomendação**: Para produção, use **Railway (backend) + Vercel (frontend)** para ter todas as features sem limitações.

Para MVP/teste rápido, Vercel serverless funciona bem! 🚀
