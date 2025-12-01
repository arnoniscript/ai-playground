# ⚡ Quick Setup - Execute Agora

## 1️⃣ Criar Admin no Banco de Dados

**Acesse o Supabase SQL Editor**:
https://supabase.com/dashboard/project/ixfvrgszjopmaxpbzlhb/sql

**Execute este SQL** (substitua o email):

```sql
INSERT INTO users (email, role, full_name)
VALUES ('seu-email@marisa.care', 'admin', 'Seu Nome')
ON CONFLICT (email)
DO UPDATE SET role = 'admin';

-- Verificar
SELECT id, email, role, full_name FROM users WHERE role = 'admin';
```

---

## 2️⃣ Testar Backend

```bash
# Terminal 1 - Backend
cd /Users/luizarnoni/ai-marisa-playground/backend
npm run dev

# Aguarde aparecer: "Server running on port 3001"
```

**Testar em outro terminal**:

```bash
# Health check
curl http://localhost:3001/health

# Resultado esperado: {"status":"ok","timestamp":"..."}
```

---

## 3️⃣ Testar Frontend

```bash
# Terminal 2 - Frontend
cd /Users/luizarnoni/ai-marisa-playground/frontend
npm run dev

# Aguarde aparecer: "Ready on http://localhost:3000"
```

---

## 4️⃣ Fazer Login como Admin

1. **Abrir navegador**: http://localhost:3000/login

2. **Digitar email**: `seu-email@marisa.care` (o que você criou no SQL)

3. **Ver OTP no terminal do backend**:

   - No terminal onde backend está rodando
   - Procurar: `OTP for seu-email@marisa.care: 123456`

4. **Digitar OTP e verificar**

5. **Verificar role**:
   - Abrir DevTools (F12)
   - Console:
   ```javascript
   JSON.parse(localStorage.getItem("user"));
   // Deve mostrar: { ..., role: "admin" }
   ```

---

## 5️⃣ Acessar Admin Dashboard

**Opções**:

- http://localhost:3000/admin
- http://localhost:3000/admin/dashboard

**✅ Deve ver**:

- Título "Dashboard Admin"
- Botão "+ Novo Playground"

---

## 6️⃣ Criar Primeiro Playground

1. **Clicar em "+ Novo Playground"**

2. **Preencher**:

   - Nome: `Teste 01`
   - Tipo: `Teste A/B`
   - Modelos (adicionar 2):
     - Chave: `model_a`
     - Código Embed: `<elevenlabs-convai agent-id="test-a"></elevenlabs-convai>`
   - Perguntas (adicionar 1):
     - Texto: `Como você avalia?`
     - Tipo: `Múltipla Escolha`
     - Adicionar opções: `Excelente`, `Bom`, `Regular`

3. **Clicar "Criar Playground"**

4. **✅ Deve redirecionar** para página de edição

---

## 🐛 Se Der Erro

### "Admin access required"

```sql
-- Executar no Supabase
UPDATE users SET role = 'admin' WHERE email = 'seu-email@marisa.care';
```

### 404 em /admin/playgrounds

- Usar `/admin/dashboard` ao invés de `/admin/playgrounds`

### Email não chega

- OTP aparece no console do backend
- Procurar linha: `OTP for email: 123456`

### CORS error

```bash
# Verificar backend/.env
CORS_ORIGIN=http://localhost:3000
```

---

## 📊 Verificar se Funcionou

### No Backend (Terminal)

```
✅ Server running on port 3001 (development)
✅ OTP for admin@marisa.care: 123456
✅ (Sem erros vermelhos)
```

### No Frontend (Navegador)

```
✅ Login funciona
✅ Vê Dashboard Admin
✅ Pode criar playground
✅ Pode editar playground
```

### No Banco de Dados

```sql
-- Ver admin criado
SELECT * FROM users WHERE role = 'admin';

-- Ver playgrounds criados
SELECT id, name, type, is_active FROM playgrounds;
```

---

## 🎯 Próximos Passos

Depois que funcionar:

1. **Criar mais playgrounds** com diferentes modelos
2. **Testar como tester** (fazer logout e login com email diferente)
3. **Avaliar playgrounds** como tester
4. **Ver métricas** como admin

---

## 🔗 Links Importantes

- **Frontend**: http://localhost:3000
- **Backend Health**: http://localhost:3001/health
- **Login**: http://localhost:3000/login
- **Admin Dashboard**: http://localhost:3000/admin/dashboard
- **Criar Playground**: http://localhost:3000/admin/create-playground
- **Supabase**: https://supabase.com/dashboard/project/ixfvrgszjopmaxpbzlhb

---

**Documentação Completa**: `docs/SETUP_VALIDATION_GUIDE.md`
