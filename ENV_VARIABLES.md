# 📋 Variáveis de Ambiente - Copiar e Colar

## 🔧 Railway (Backend)

Copie e cole na aba "Variables" do Railway:

```
SUPABASE_URL=https://ixfvrgszjopmaxpbzlhb.supabase.co
```

```
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4ZnZyZ3N6am9wbWF4cGJ6bGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0Mzg3ODAsImV4cCI6MjA0NzAxNDc4MH0.XqYrcKLPdBXW5A5pR0LwcWXdB1wSZh-0jZz9qWJaAmw
```

```
JWT_SECRET=marisa-ai-playground-super-secret-key-production-2024
```

```
ALLOWED_EMAIL_DOMAIN=marisa.care
```

```
RESEND_API_KEY=COLE_SUA_CHAVE_AQUI
```

```
EMAIL_FROM=onboarding@resend.dev
```

```
NODE_ENV=production
```

```
PORT=3001
```

```
CORS_ORIGIN=COLE_URL_VERCEL_AQUI
```

---

## 🎨 Vercel (Frontend)

Copie e cole em "Environment Variables" da Vercel:

**Key:**

```
NEXT_PUBLIC_API_URL
```

**Value:**

```
https://COLE_URL_RAILWAY_AQUI
```

⚠️ **IMPORTANTE**:

- Não incluir barra no final: ❌ `https://url.app/`
- Formato correto: ✅ `https://url.app`

---

## 🔑 Onde Pegar Cada Valor

### SUPABASE_URL e SUPABASE_ANON_KEY

✅ Já preenchidos acima! (Supabase do projeto)

### JWT_SECRET

✅ Já preenchido acima! (`marisa-ai-playground-super-secret-key-production-2024`)

### RESEND_API_KEY

1. Acessar: https://resend.com/api-keys
2. Fazer login
3. Criar API Key
4. Copiar e colar

### CORS_ORIGIN

1. Deploy na Vercel primeiro
2. Copiar URL da Vercel (ex: `https://ai-marisa.vercel.app`)
3. Colar no Railway

### NEXT_PUBLIC_API_URL

1. Deploy no Railway primeiro
2. Copiar URL do Railway (ex: `https://ai-marisa.up.railway.app`)
3. Colar na Vercel

---

## 📝 Ordem Correta

1. **Primeiro**: Configurar Railway com todas as variáveis (CORS_ORIGIN = TEMP por enquanto)
2. **Segundo**: Deploy na Vercel (usar URL do Railway no NEXT_PUBLIC_API_URL)
3. **Terceiro**: Voltar no Railway e atualizar CORS_ORIGIN com URL da Vercel

---

## ✅ Valores Finais (Exemplo)

### Railway:

```
SUPABASE_URL=https://ixfvrgszjopmaxpbzlhb.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
JWT_SECRET=marisa-ai-playground-super-secret-key-production-2024
ALLOWED_EMAIL_DOMAIN=marisa.care
RESEND_API_KEY=re_abc123xyz
EMAIL_FROM=onboarding@resend.dev
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://ai-marisa.vercel.app
```

### Vercel:

```
NEXT_PUBLIC_API_URL=https://ai-marisa.up.railway.app
```

---

## 🚨 Erros Comuns

### ❌ CORS_ORIGIN com barra no final

```
CORS_ORIGIN=https://app.vercel.app/  ← ERRADO
CORS_ORIGIN=https://app.vercel.app   ← CORRETO
```

### ❌ NEXT_PUBLIC_API_URL sem https://

```
NEXT_PUBLIC_API_URL=app.railway.app          ← ERRADO
NEXT_PUBLIC_API_URL=https://app.railway.app  ← CORRETO
```

### ❌ Usar .env.local em produção

- ❌ Não commitar .env.local
- ✅ Configurar variáveis na plataforma (Railway/Vercel)

---

**Dica**: Salve este arquivo! Você vai precisar dessas variáveis. 📌
