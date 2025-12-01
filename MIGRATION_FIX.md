✅ FIX MIGRATION ERROR

═══════════════════════════════════════════════════════════════════════

ERRO ENCONTRADO:
"column "playground_type" does not exist"

CAUSA:
Na tabela `questions`, havia uma constraint referenciando
`playground_type` que não existe naquela tabela.

SOLUÇÃO APLICADA:
✓ Removida a constraint da tabela questions
✓ Validação será feita no código da aplicação

ARQUIVO CORRIGIDO:
supabase/migrations/001_initial_schema.sql

═══════════════════════════════════════════════════════════════════════

AGORA EXECUTE AS MIGRATIONS NOVAMENTE:

OPÇÃO 1: Via SQL Editor (Recomendado)

1. Acesse: https://app.supabase.com
2. SQL Editor > New Query
3. Abra: supabase/migrations/001_initial_schema.sql
4. Copie TODO o conteúdo
5. Cole no SQL Editor do Supabase
6. Clique "Run"

OPÇÃO 2: Via Supabase CLI
supabase db push

OPÇÃO 3: Via Script
cd /Users/luizarnoni/ai-marisa-playground
./setup-supabase.sh

═══════════════════════════════════════════════════════════════════════

PRÓXIMA ETAPA (Após migrations bem-sucedidas):

1. Criar usuário ADMIN:
   INSERT INTO users (email, full_name, role)
   VALUES ('admin@marisa.care', 'Admin', 'admin');

2. Criar usuário TESTER:
   INSERT INTO users (email, full_name, role)
   VALUES ('tester@marisa.care', 'Tester', 'tester');

3. Testar: http://localhost:3000

═══════════════════════════════════════════════════════════════════════
