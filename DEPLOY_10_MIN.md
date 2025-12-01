# ⚡ Deploy em 10 Minutos

## Pré-requisitos

- [ ] Conta no GitHub
- [ ] Conta na Vercel (login com GitHub)
- [ ] Conta no Railway OU Render (login com GitHub)
- [ ] Chave da Resend API: https://resend.com/api-keys

---

## 🚀 Passo a Passo

### 1️⃣ Subir código no GitHub (2 min)

```bash
cd /Users/luizarnoni/ai-marisa-playground

# Se ainda não inicializou git
git init
git add .
git commit -m "Ready for deploy"

# Criar repo no GitHub
# Ir para: https://github.com/new
# Nome: ai-marisa-playground
# Público ou Privado: Privado
# Criar repository

# Push para GitHub
git remote add origin https://github.com/SEU-USUARIO/ai-marisa-playground.git
git branch -M main
git push -u origin main
```

---

### 2️⃣ Deploy Backend no Railway (3 min)

1. **Acessar**: https://railway.app
2. **Login** com GitHub
3. **New Project** → **Deploy from GitHub repo**
4. **Selecionar**: `ai-marisa-playground`
5. **Settings**:
   - Name: `ai-marisa-backend`
   - Root Directory: `backend`
6. **Variables** (clicar na aba "Variables"):

   ```
   SUPABASE_URL=https://ixfvrgszjopmaxpbzlhb.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4ZnZyZ3N6am9wbWF4cGJ6bGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0Mzg3ODAsImV4cCI6MjA0NzAxNDc4MH0.XqYrcKLPdBXW5A5pR0LwcWXdB1wSZh-0jZz9qWJaAmw
   JWT_SECRET=seu-secret-muito-seguro-minimo-32-caracteres-para-producao
   ALLOWED_EMAIL_DOMAIN=marisa.care
   RESEND_API_KEY=re_SUA_CHAVE_AQUI
   EMAIL_FROM=onboarding@resend.dev
   NODE_ENV=production
   PORT=3001
   CORS_ORIGIN=https://TEMP
   ```

   **⚠️ Nota**: Vamos atualizar CORS_ORIGIN depois

7. **Deploy** (automático após adicionar variáveis)
8. **Copiar URL**: Clicar em "Settings" → Copiar a URL (ex: `ai-marisa-backend.up.railway.app`)

---

### 3️⃣ Deploy Frontend na Vercel (3 min)

1. **Acessar**: https://vercel.com
2. **Login** com GitHub
3. **Add New** → **Project**
4. **Import** `ai-marisa-playground`
5. **Configure**:
   - Framework Preset: **Next.js** (detecta automaticamente)
   - Root Directory: **frontend** (clicar em Edit e digitar `frontend`)
   - Build Command: `npm run build` (deixar padrão)
   - Output Directory: `.next` (deixar padrão)
6. **Environment Variables**:

   ```
   NEXT_PUBLIC_API_URL=https://ai-marisa-backend.up.railway.app
   ```

   ⚠️ Substituir pela URL copiada do Railway (SEM http:// se já incluir, SEM barra no final)

7. **Deploy** (clicar no botão azul)

8. **Aguardar build** (~2 min)

9. **Copiar URL da Vercel** (ex: `ai-marisa-playground.vercel.app`)

---

### 4️⃣ Atualizar CORS no Backend (1 min)

1. **Voltar no Railway**
2. **Variables**
3. **Editar** `CORS_ORIGIN`:

   ```
   CORS_ORIGIN=https://ai-marisa-playground.vercel.app
   ```

   ⚠️ Substituir pela URL da Vercel copiada (COM https://, SEM barra no final)

4. **Salvar** (redeploy automático)

---

### 5️⃣ Testar (1 min)

1. **Abrir**: `https://sua-app.vercel.app`
2. **Fazer login** com email admin
3. **Verificar OTP**:
   - Railway → Deployments → Ver logs
   - Procurar: `OTP for email: 123456`
4. **Criar playground**
5. **✅ Funcionou!**

---

## 🐛 Se Der Erro

### "Failed to fetch"

```bash
# Verificar no DevTools → Network
# Se aparecer CORS error:

# Railway → Variables → Verificar:
CORS_ORIGIN=https://sua-app.vercel.app  # SEM barra no final

# Salvar e aguardar redeploy
```

### "Internal Server Error"

```bash
# Railway → Deployments → Ver logs
# Procurar erro vermelho
# Geralmente é variável faltando
```

### Build falha na Vercel

```bash
# Vercel → Deployment → Ver logs
# Se erro de módulo não encontrado:
# - Verificar se Root Directory = frontend
# - Verificar se package.json existe em frontend/
```

### Backend não inicia

```bash
# Railway → Logs
# Se erro "Cannot find module":
# - Verificar Root Directory = backend
# - Verificar se package.json existe em backend/
```

---

## ✅ Checklist Final

- [ ] Código no GitHub
- [ ] Backend deployado no Railway
- [ ] URL do Railway copiada
- [ ] Frontend deployado na Vercel
- [ ] URL da Vercel copiada
- [ ] CORS_ORIGIN atualizado no Railway
- [ ] Login funciona no site
- [ ] OTP aparece nos logs do Railway
- [ ] Consegue criar playground

---

## 🔗 Seus Links

Anote aqui:

- **Frontend**: https://__________________.vercel.app
- **Backend**: https://__________________.up.railway.app
- **GitHub**: https://github.com/SEU-USUARIO/ai-marisa-playground

---

## 💰 Custos

- **Vercel**: Grátis
- **Railway**: $5 grátis/mês (depois ~$5-10/mês)
- **Supabase**: Grátis (até 500MB)
- **Resend**: 100 emails/dia grátis

Total: **$0 no primeiro mês**, depois ~$5-10/mês

---

## 📞 Comandos Úteis

```bash
# Ver logs do backend
# Railway → Deployments → Ver logs ao vivo

# Redeploy frontend
# Vercel → Deployments → ... → Redeploy

# Atualizar código
git add .
git commit -m "Update"
git push
# Vercel e Railway redeployam automaticamente
```

---

**Pronto!** Seu playground está online 🚀

Compartilhe o link da Vercel com os usuários!
