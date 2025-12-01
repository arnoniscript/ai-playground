## 🗄️ Guia de Setup das Migrations do Supabase

Você já criou o projeto Supabase e configurou os `.env`. Agora execute a migration:

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# 1. Instale Supabase CLI se não tiver:
brew install supabase/tap/supabase

# 2. Na raiz do projeto, execute:
supabase link  # Link seu projeto local ao Supabase remoto
supabase db push  # Faz push das migrations
```

### Opção 2: Via SQL Editor do Supabase (Interface Web)

1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá em "SQL Editor" (lado esquerdo)
4. Clique em "New Query"
5. Cole o conteúdo de `supabase/migrations/001_initial_schema.sql`
6. Clique "Run"

### Opção 3: Via psql (Linha de comando)

```bash
# 1. Pegue a connection string no Supabase:
#    Project Settings > Database > Connection string (URI)

# 2. Execute:
psql "postgresql://postgres:password@db.supabasehost.com:5432/postgres" \
  -f supabase/migrations/001_initial_schema.sql
```

---

### ✅ Verificar se Migrations Foram Executadas

Depois de rodar a migration, verifique no Supabase:

1. Acesse https://app.supabase.com > seu projeto
2. Vá em "Database" (lado esquerdo)
3. Expanda "Tables" - você deve ver:

   - `users`
   - `playgrounds`
   - `model_configurations`
   - `evaluation_counters`
   - `questions`
   - `evaluations`
   - `audit_log`

4. Expanda "Views" - você deve ver:
   - `playground_metrics`
   - `question_metrics`
   - `open_responses`

---

### 🔄 Em Caso de Erro

Se receber erro sobre "relation already exists", significa que as migrations já foram executadas.

Se precisar limpar e começar do zero:

```sql
-- ⚠️ PERIGOSO: Deleta todos os dados!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;

-- Depois, execute novamente as migrations
```

---

### 📌 Após Migrations - Próximos Passos

1. **Criar usuário ADMIN** (teste):

   ```sql
   INSERT INTO users (email, full_name, role)
   VALUES ('admin@marisa.care', 'Admin User', 'admin');
   ```

2. **Criar usuário TESTER** (teste):

   ```sql
   INSERT INTO users (email, full_name, role)
   VALUES ('tester@marisa.care', 'Tester User', 'tester');
   ```

3. **Testar Login**:
   - Backend rodando: `npm run dev` (porta 3001)
   - Frontend rodando: `npm run dev` (porta 3000)
   - Acesse http://localhost:3000
   - Use email `admin@marisa.care` ou `tester@marisa.care`

---

### 🐛 Debug - Ver Status das Migrations

No Supabase, execute:

```sql
-- Ver todas as tabelas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Ver todas as views
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public';

-- Ver policies (RLS)
SELECT schemaname, tablename, policyname
FROM pg_policies;
```

---

Pronto! Suas migrations estão configuradas! 🎉
