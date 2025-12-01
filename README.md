# AI Marisa Playground - Eleven Labs Conversational AI Testing Platform

Sistema de playground para testes e avaliação de modelos de IA conversacional da Eleven Labs com suporte a A/B testing e Tuning.

## 🏗️ Stack Tecnológico

- **Backend**: Node.js + Express
- **Frontend**: Next.js 14+ + React 18
- **Banco de Dados**: Supabase (PostgreSQL)
- **Hospedagem**: Vercel (Frontend) + Supabase + Vercel Functions (Backend)
- **Autenticação**: Supabase Auth (Email OTP)
- **UI**: Shadcn/ui + Tailwind CSS

## 📁 Estrutura do Projeto

```
ai-marisa-playground/
├── backend/                  # Server Node.js/Express
├── frontend/                 # Next.js app
├── supabase/                 # Migrations e seed
└── docs/                     # Documentação
```

## 🚀 Quick Start

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📋 Funcionalidades

- ✅ Autenticação por email (@marisa.care) + OTP
- ✅ Dois roles: Admin (criar playgrounds, métricas) e Tester (avaliar)
- ✅ Playgrounds A/B Testing e Tuning
- ✅ Perguntas customizadas (select/input string)
- ✅ Limite de avaliações por modelo
- ✅ Dashboard de métricas para admin
- ✅ Suporte a scripts Eleven Labs sem segurança adicional

## 🔑 Variáveis de Ambiente

Ver `.env.example` em cada diretório.

## 📚 Documentação

- [Schema PostgreSQL](docs/database-schema.md)
- [API Endpoints](docs/api-endpoints.md)
- [Fluxo de Autenticação](docs/auth-flow.md)
