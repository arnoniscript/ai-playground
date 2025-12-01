📋 SETUP CHECKLIST - AI MARISA PLAYGROUND

═══════════════════════════════════════════════════════════════════════

FASE 1: ✅ ESTRUTURA DO PROJETO (COMPLETO)
✓ Backend com Express + TypeScript
✓ Frontend com Next.js + React
✓ Configuração Tailwind CSS
✓ Sistema de autenticação (OTP + JWT)
✓ RBAC (Admin/Tester)
✓ Integração Supabase

FASE 2: ✅ CORREÇÕES E COMPILAÇÃO (COMPLETO)
✓ TypeScript compilation (backend e frontend)
✓ Erros resolvidos
✓ npm packages instalados

FASE 3: ✅ SERVIDORES RODANDO (COMPLETO)
✓ Backend em http://localhost:3001
✓ Frontend em http://localhost:3000
✓ Node.js v22 configurado para frontend

FASE 4: 🔄 SUPABASE DATABASE (EM ANDAMENTO)
⏳ Executar migrations SQL
⏳ Criar usuários de teste
⏳ Verificar tabelas e views

FASE 5: ⏭️ TESTES E FUNCIONALIDADE (PRÓXIMO)
⏳ Testar login com OTP
⏳ Testar dashboards (admin/tester)
⏳ Criar playgrounds
⏳ Testar avaliações

═══════════════════════════════════════════════════════════════════════

🎯 PRÓXIMA AÇÃO: Executar Migrations

ESCOLHA UM MÉTODO:

┌─ MÉTODO 1: AUTOMÁTICO (Recomendado) ─────────────────────────────┐
│ │
│ $ cd /Users/luizarnoni/ai-marisa-playground │
│ $ ./setup-supabase.sh │
│ > Escolha opção 1 ou 2 │
│ │
│ ⏱️ Tempo: ~2 minutos │
│ │
└────────────────────────────────────────────────────────────────────┘

┌─ MÉTODO 2: MANUAL VIA WEB (Mais rápido) ──────────────────────────┐
│ │
│ 1. Acesse: https://app.supabase.com │
│ 2. Clique em seu projeto │
│ 3. Menu esquerdo > SQL Editor │
│ 4. Clique "New Query" │
│ 5. Abra: supabase/migrations/001_initial_schema.sql │
│ 6. Copie TODO o conteúdo │
│ 7. Cole no SQL Editor │
│ 8. Clique "Run" │
│ │
│ ⏱️ Tempo: ~1 minuto │
│ │
└────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════

✅ APÓS MIGRATIONS:

[ ] 1. Verificar tabelas criadas (SQL Editor):
SELECT COUNT(\*) FROM users;

[ ] 2. Criar usuário ADMIN (SQL Editor):
INSERT INTO users (email, full_name, role)
VALUES ('admin@marisa.care', 'Admin', 'admin');

[ ] 3. Criar usuário TESTER (SQL Editor):
INSERT INTO users (email, full_name, role)
VALUES ('tester@marisa.care', 'Tester', 'tester');

[ ] 4. Testar Login:
Acesse http://localhost:3000
Use: admin@marisa.care

[ ] 5. Verificar OTP:
OTP deve aparecer no console do backend

═══════════════════════════════════════════════════════════════════════

🚀 STATUS DOS SERVIDORES:

Backend (Express):
URL: http://localhost:3001
Status: ✅ RODANDO
Comando: cd backend && npm run dev

Frontend (Next.js):
URL: http://localhost:3000
Status: ✅ RODANDO
Comando: cd frontend && npm run dev (Node v22)

Database (Supabase):
URL: https://app.supabase.com
Status: ⏳ PENDENTE (aguardando migrations)

═══════════════════════════════════════════════════════════════════════

📚 DOCUMENTAÇÃO DISPONÍVEL:

• README.md (Visão geral)
• QUICKSTART.md (Guia rápido)
• PROJECT_SUMMARY.txt (Resumo do projeto)
• SUPABASE_MIGRATION_GUIDE.md (Guia de migrations)
• RUN_MIGRATIONS.txt (Instruções rápidas)
• PROJECT_STATUS.md (Status atual)
• docs/database-schema.md (Schema do banco)
• docs/api-endpoints.md (Endpoints da API)
• docs/auth-flow.md (Fluxo de autenticação)

═══════════════════════════════════════════════════════════════════════

💡 DICAS:

• Se der erro "relation already exists", as migrations já foram
executadas. Faça apenas os inserts dos usuários de teste.

• OTP em desenvolvimento: veja no console do backend
Em produção: será enviado por email (configure SendGrid/Resend)

• JWT tokens: expiram em 7 dias
OTP: válido por 10 minutos

• Se precisar resetar o banco: execute DROP SCHEMA public CASCADE;
Depois re-execute todas as migrations.

═══════════════════════════════════════════════════════════════════════

Tudo pronto! Bora executar as migrations? 🚀
