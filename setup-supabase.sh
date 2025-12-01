#!/bin/bash

# Script para executar migrations do Supabase
# Uso: ./setup-supabase.sh

set -e

echo "🚀 Iniciando setup do Supabase..."
echo ""

# Verificar se .env existe
if [ ! -f "backend/.env" ]; then
    echo "❌ Arquivo backend/.env não encontrado"
    echo "   Copie backend/.env.example para backend/.env e configure"
    exit 1
fi

# Extrair SUPABASE_URL
SUPABASE_URL=$(grep "SUPABASE_URL=" backend/.env | cut -d '=' -f2)

if [ -z "$SUPABASE_URL" ]; then
    echo "❌ SUPABASE_URL não está configurada em backend/.env"
    exit 1
fi

echo "✓ SUPABASE_URL encontrada: $SUPABASE_URL"
echo ""

# Verificar se psql está instalado
if ! command -v psql &> /dev/null; then
    echo "⚠️  psql não está instalado. Instalando via brew..."
    brew install libpq
    echo ""
fi

echo "📋 Opções para executar as migrations:"
echo ""
echo "1️⃣  Via Supabase CLI (recomendado)"
echo "2️⃣  Via SQL Editor web (manual)"
echo "3️⃣  Via psql (requer credenciais)"
echo ""
read -p "Escolha uma opção (1-3): " option

case $option in
    1)
        echo ""
        echo "📦 Instalando Supabase CLI..."
        brew install supabase/tap/supabase || true
        
        echo ""
        echo "🔗 Linkando projeto local ao Supabase..."
        supabase link --project-ref ixfvrgszjopmaxpbzlhb
        
        echo ""
        echo "🗄️  Executando migrations..."
        supabase db push
        
        echo ""
        echo "✅ Migrations executadas com sucesso!"
        ;;
    2)
        echo ""
        echo "📝 Migração Manual:"
        echo "1. Acesse: https://app.supabase.com"
        echo "2. Selecione seu projeto"
        echo "3. Vá em 'SQL Editor'"
        echo "4. Clique 'New Query'"
        echo "5. Cole o conteúdo de: supabase/migrations/001_initial_schema.sql"
        echo "6. Clique 'Run'"
        echo ""
        cat supabase/migrations/001_initial_schema.sql | pbcopy
        echo "✓ SQL copiada para clipboard!"
        echo ""
        open "https://app.supabase.com/project/ixfvrgszjopmaxpbzlhb/sql"
        ;;
    3)
        echo ""
        read -p "Cole a connection string do Supabase (postgresql://...): " CONNECTION_STRING
        
        echo ""
        echo "🗄️  Executando migrations via psql..."
        psql "$CONNECTION_STRING" -f supabase/migrations/001_initial_schema.sql
        
        echo ""
        echo "✅ Migrations executadas com sucesso!"
        ;;
    *)
        echo "❌ Opção inválida"
        exit 1
        ;;
esac

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ SETUP SUPABASE COMPLETO!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📌 Próximos passos:"
echo ""
echo "1. Verificar tabelas no Supabase:"
echo "   https://app.supabase.com/project/ixfvrgszjopmaxpbzlhb/editor"
echo ""
echo "2. Criar usuário de teste (Admin):"
echo "   INSERT INTO users (email, full_name, role)"
echo "   VALUES ('admin@marisa.care', 'Admin', 'admin');"
echo ""
echo "3. Iniciar servidores:"
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo "4. Testar em: http://localhost:3000"
echo ""
