# 🎯 Sistema de Cadastro e Gestão de QAs

## Visão Geral

Sistema completo de cadastro público para Quality Assurance (QA) profissionais com verificação de identidade, aprovação manual e gestão administrativa.

## Especificações

### Características Principais

- ✅ Cadastro público multi-step com UX intuitiva
- ✅ Suporte trilíngue (Português, Inglês, Espanhol)
- ✅ Verificação de identidade com documento + selfie
- ✅ Geolocalização e captura de IP obrigatórios
- ✅ Upload de documentos via Supabase Storage
- ✅ Aprovação manual por administradores
- ✅ Sistema de notificações avançado
- ✅ Emails transacionais trilíngues

### Fluxo Completo

```
1. QA acessa /register-qa
2. Seleciona língua principal (PT/EN/ES)
3. Preenche 8 steps do formulário
4. Sistema valida e cria usuário (status: pending_approval)
5. QA recebe email "Cadastro em Análise"
6. Admin analisa no painel /admin/qa-management
7. Admin aprova/recusa
8. QA recebe email com resultado
9. Se aprovado: pode fazer login e acessar sistema
```

## Estrutura do Banco de Dados

### Novos Campos na Tabela `users`

```sql
-- Identificação e Localização
primary_language TEXT                -- 'pt', 'en', 'es'
nationality TEXT                     -- País de nacionalidade
phone TEXT                          -- Telefone com código país/DDD
birth_date DATE                     -- Data de nascimento
gender TEXT                         -- 'male', 'female', 'other', 'prefer_not_to_say'

-- Idiomas
secondary_languages TEXT[]          -- Array: ['en', 'es', 'fr']

-- Documentação
document_number TEXT                -- Número do documento
document_photo_url TEXT             -- URL no Supabase Storage
selfie_photo_url TEXT              -- URL no Supabase Storage

-- Verificação
geolocation JSONB                   -- {latitude, longitude, accuracy, timestamp}
ip_address TEXT                     -- IP capturado durante cadastro

-- Educação
education JSONB                     -- Array de objetos (ver abaixo)

-- Processo de Aprovação
terms_accepted_at TIMESTAMPTZ       -- Quando aceitou termos
approved_at TIMESTAMPTZ             -- Quando foi aprovado
approved_by UUID                    -- ID do admin que aprovou
rejected_at TIMESTAMPTZ             -- Quando foi recusado
rejected_by UUID                    -- ID do admin que recusou
rejection_reason TEXT               -- Motivo da recusa
```

### Formato do Campo `education`

```json
[
  {
    "degree": "Bachelor's Degree",
    "institution": "University of São Paulo",
    "field": "Computer Science",
    "year_start": 2015,
    "year_end": 2019,
    "description": "Focused on software engineering and quality assurance"
  },
  {
    "degree": "Master's Degree",
    "institution": "MIT",
    "field": "Software Engineering",
    "year_start": 2020,
    "year_end": 2022,
    "description": "Research on automated testing"
  }
]
```

## Formulário de Cadastro (8 Steps)

### Step 1: Seleção de Língua Principal

- Tela bonita e intuitiva
- 3 opções grandes com bandeiras:
  - 🇧🇷 Português
  - 🇺🇸 English
  - 🇪🇸 Español
- Todo formulário posterior na língua selecionada

### Step 2: Dados Pessoais

- Nome completo (obrigatório)
- Email (obrigatório, validação)
- Data de nascimento (date picker)
- Gênero (select: male/female/other/prefer_not_to_say)
- Nacionalidade (select de países)
- Telefone (input com código país + DDD)

### Step 3: Línguas Secundárias

- Checkboxes com principais línguas
- Múltipla seleção
- Visual limpo

### Step 4: Documento de Identificação

- Input: número do documento
- Upload de foto do documento
- Preview da imagem
- Validação de formato (JPG, PNG, PDF)
- Max 5MB

### Step 5: Geolocalização

- Solicita permissão automaticamente
- Se negado: instruções claras para autorizar
- Mostra latitude/longitude capturados
- Não pode prosseguir sem autorizar

### Step 6: Selfie via Webcam

- Solicita permissão da câmera
- Preview da câmera em tempo real
- Botão "Tirar Foto"
- Preview da foto tirada
- Opção "Tirar Novamente"
- Não pode prosseguir sem foto

### Step 7: Escolaridade

- Lista dinâmica de formações
- Botão "+ Adicionar Formação"
- Campos por formação:
  - Grau (Bachelor, Master, PhD, etc)
  - Instituição
  - Área de estudo
  - Ano início
  - Ano término
  - Descrição (textarea)
- Botão "Remover" em cada item
- Mínimo 1 formação

### Step 8: Termos e Condições

- Texto completo dos termos (scrollable)
- Checkbox "Aceito os termos e condições" (obrigatório)
- Botão "Concluir Cadastro"
- Loading state durante envio

## Supabase Storage

### Buckets

```
qa-documents/
  └── {user_id}/
      └── document.{ext}

qa-selfies/
  └── {user_id}/
      └── selfie.jpg
```

### Políticas de Acesso

- **Upload**: Público (rota pública de registro)
- **Read**: Apenas admin + próprio usuário
- **Delete**: Apenas admin

### Configuração

```sql
-- Criar buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('qa-documents', 'qa-documents', false),
  ('qa-selfies', 'qa-selfies', false);

-- Políticas
CREATE POLICY "Admin can read all QA documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'qa-documents' AND auth.role() = 'admin');

CREATE POLICY "QA can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'qa-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
```

## Backend - Rotas

### Cadastro Público

```typescript
POST /auth/register-qa
Body: {
  // Step 1
  primary_language: 'pt' | 'en' | 'es',

  // Step 2
  full_name: string,
  email: string,
  birth_date: string,
  gender: string,
  nationality: string,
  phone: string,

  // Step 3
  secondary_languages: string[],

  // Step 4
  document_number: string,
  document_photo: string, // base64

  // Step 5
  geolocation: {
    latitude: number,
    longitude: number,
    accuracy: number
  },

  // Step 6
  selfie_photo: string, // base64

  // Step 7
  education: Education[],

  // Step 8
  terms_accepted: true
}

Response: {
  message: "Registration submitted successfully",
  data: { id, email, status: 'pending_approval' },
  redirect: "/register-qa/pending"
}
```

### Gestão Admin

```typescript
GET /admin/qa
// Lista todos QAs com filtros: pending/approved/rejected

GET /admin/qa/:id
// Detalhes completos de um QA

PUT /admin/qa/:id/approve
// Aprova QA, muda status para 'active'

PUT /admin/qa/:id/reject
Body: { reason: string }
// Recusa QA

POST /admin/qa/:id/notify
Body: {
  type: 'banner' | 'modal' | 'email',
  title: string,
  message: string,
  image_url?: string // apenas para modal
}
```

## Emails Transacionais

### 1. Cadastro em Análise

**Assunto (PT)**: ⏳ Seu cadastro está em análise
**Assunto (EN)**: ⏳ Your registration is under review
**Assunto (ES)**: ⏳ Su registro está en revisión

**Conteúdo**:

- Confirmação de recebimento
- Tempo de análise: até 3 dias
- Próximos passos
- Informações de contato

### 2. Cadastro Aprovado

**Assunto (PT)**: ✅ Cadastro aprovado! Bem-vindo à equipe
**Assunto (EN)**: ✅ Registration approved! Welcome to the team
**Assunto (ES)**: ✅ ¡Registro aprobado! Bienvenido al equipo

**Conteúdo**:

- Congratulações
- Instruções de acesso
- Link para login
- Recursos disponíveis

### 3. Cadastro Recusado

**Assunto (PT)**: ❌ Atualização sobre seu cadastro
**Assunto (EN)**: ❌ Update on your registration
**Assunto (ES)**: ❌ Actualización sobre su registro

**Conteúdo**:

- Informação educada sobre recusa
- Motivo (se fornecido)
- Possibilidade de reapply
- Agradecimento pelo interesse

## Sistema de Notificações

### Tipos de Notificação

#### 1. Banner (Topo)

- Ocupa 100% da largura
- Fixa no topo da página
- Cores configuráveis (info/warning/success/error)
- Dispensável com X
- Persiste até ser dispensada

#### 2. Modal (Centro)

- Overlay escurecido
- Card centralizado
- Suporta imagem
- Título + mensagem
- Botão "Entendi" ou "Fechar"
- Dismissable

#### 3. Email

- Template HTML bonito
- Assunto configurável
- Conteúdo em HTML

### Tabela `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'banner', 'modal', 'email'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,

  -- Destinatários
  target_type TEXT NOT NULL, -- 'all', 'role', 'specific'
  target_role TEXT, -- se target_type = 'role'
  target_user_ids UUID[], -- se target_type = 'specific'

  -- Controle
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,

  -- Tracking (quem já viu/dispensou)
  dismissed_by UUID[] DEFAULT ARRAY[]::UUID[]
);
```

### Lógica de Exibição

```typescript
// Frontend carrega notificações ao montar layout
useEffect(() => {
  const notifications = await api.get("/notifications/active");
  // Filtra as que o usuário ainda não dispensou
  // Exibe banners no topo
  // Exibe modal mais recente (um por vez)
}, []);
```

## Frontend - Estrutura

```
frontend/
  app/
    register-qa/
      page.tsx                  # Formulário multi-step
      pending/
        page.tsx               # Feedback pós-cadastro
    admin/
      qa-management/
        page.tsx               # Lista QAs
        [id]/
          page.tsx             # Detalhes + aprovação
      notifications/
        page.tsx               # Criar/gerenciar notificações
  components/
    register-qa/
      LanguageSelector.tsx     # Step 1
      PersonalInfo.tsx         # Step 2
      SecondaryLanguages.tsx   # Step 3
      DocumentUpload.tsx       # Step 4
      GeolocationCapture.tsx   # Step 5
      SelfieCapture.tsx        # Step 6
      EducationForm.tsx        # Step 7
      TermsAgreement.tsx       # Step 8
    notifications/
      NotificationBanner.tsx
      NotificationModal.tsx
  contexts/
    LanguageContext.tsx        # i18n
  lib/
    translations/
      pt.json
      en.json
      es.json
```

## Fluxo Admin - Análise de QA

### Tela: `/admin/qa-management`

**Tabs**:

- Pendentes (badge com contador)
- Aprovados
- Recusados

**Card de QA Pendente**:

- Foto do perfil (selfie)
- Nome completo
- Email
- Data de cadastro
- Nacionalidade
- Botão "Analisar"

### Tela: `/admin/qa-management/[id]`

**Seções**:

1. **Dados Pessoais**

   - Todos os campos preenchidos
   - Data de nascimento + idade calculada

2. **Verificação de Identidade**

   - Preview documento (ampliável)
   - Preview selfie (ampliável)
   - Número do documento

3. **Localização**

   - Mapa com pin da geolocalização
   - IP capturado
   - Timestamp

4. **Educação**

   - Lista de todas formações
   - Detalhes expandíveis

5. **Idiomas**
   - Primário (destaque)
   - Secundários (tags)

**Ações**:

- ✅ Aprovar (botão verde)
- ❌ Recusar (abre modal para motivo)
- 🚫 Banir (confirmação)
- 📧 Enviar Notificação

## Segurança

### Validações Backend

- Email único no sistema
- Idade mínima: 18 anos
- Documento obrigatório + foto
- Selfie obrigatória
- Geolocalização obrigatória
- Pelo menos 1 formação
- Termos aceitos obrigatório

### Rate Limiting

```typescript
// Máximo 3 tentativas de cadastro por IP por hora
app.use(
  "/auth/register-qa",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
  })
);
```

### Sanitização

- Todos inputs HTML escapados
- Validação de tipos no Zod
- Limite de tamanho de arquivos
- Validação de formatos de imagem

## Próximos Passos de Implementação

1. ✅ Migration 009 criada
2. ✅ Tipos atualizados
3. 🔄 Configurar Supabase Storage
4. 🔄 Implementar rota POST /auth/register-qa
5. ⏳ Criar templates de email trilíngues
6. ⏳ Implementar contexto i18n
7. ⏳ Criar formulário multi-step frontend
8. ⏳ Criar painel admin QA management
9. ⏳ Implementar sistema de notificações

## Variáveis de Ambiente

```env
# Backend
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx  # Para upload de arquivos
```

## Testes

### Fluxo Completo

1. Acesse http://localhost:3000/register-qa
2. Selecione língua
3. Preencha todos os 8 steps
4. Verifique email "Cadastro em análise"
5. Como admin, acesse /admin/qa-management
6. Analise o cadastro
7. Aprove
8. Verifique email "Cadastro aprovado"
9. Faça login como QA
10. Veja notificações ativas
