# Sistema de Cursos Introdutórios - Documentação

## Visão Geral

Sistema completo para criação e gestão de cursos introdutórios com steps, avaliações e métricas detalhadas.

## Funcionalidades Implementadas

### 1. Backend - API

#### Rotas de Administração (`/admin/courses`)

- **GET /admin/courses** - Lista todos os cursos
- **GET /admin/courses/:id** - Busca curso com todos steps e questões
- **POST /admin/courses** - Cria novo curso
- **PUT /admin/courses/:id** - Atualiza curso
- **DELETE /admin/courses/:id** - Deleta curso

#### Gestão de Steps

- **POST /admin/courses/:courseId/steps** - Adiciona step ao curso
- **PUT /admin/courses/:courseId/steps/:stepId** - Atualiza step
- **DELETE /admin/courses/:courseId/steps/:stepId** - Deleta step

#### Gestão de Questões

- **POST /admin/courses/:courseId/steps/:stepId/questions** - Adiciona questão
- **PUT /admin/courses/:courseId/steps/:stepId/questions/:questionId** - Atualiza questão
- **DELETE /admin/courses/:courseId/steps/:stepId/questions/:questionId** - Deleta questão

#### Rotas para Usuários (`/courses`)

- **GET /courses** - Lista cursos publicados
- **GET /courses/:id** - Busca curso (sem respostas corretas)
- **POST /courses/:id/start** - Inicia curso
- **POST /courses/:courseId/steps/:stepId/submit** - Submete avaliação
- **POST /courses/:courseId/steps/:stepId/complete** - Completa step
- **GET /courses/:courseId/progress** - Busca progresso do usuário
- **GET /courses/:courseId/steps/:stepId/attempts** - Busca tentativas do step

#### Rotas de Métricas (`/admin/courses/:courseId/metrics`)

- **GET /admin/courses/:courseId/metrics** - Métricas gerais do curso
- **GET /admin/courses/:courseId/users** - Métricas de todos usuários
- **GET /admin/courses/:courseId/users/:userId** - Métricas de usuário específico
- **GET /admin/courses/:courseId/steps/:stepId/metrics** - Métricas de step específico

### 2. Frontend - Interfaces

#### Para Administradores

**Lista de Cursos** (`/admin/courses`)

- Visualização de todos os cursos
- Indicadores de status (Publicado/Rascunho)
- Ações: Editar, Deletar, Ver Métricas

**Editor de Curso** (`/admin/courses/create` e `/admin/courses/:id/edit`)

- Formulário para título, descrição
- Toggle de publicação
- Lista de steps do curso
- Navegação para edição de steps

**Editor de Step** (`/admin/courses/:id/steps/create` e `/admin/courses/:id/steps/:stepId/edit`)

- Ordem do step
- Título e conteúdo textual
- URLs para imagem, vídeo e áudio
- Configuração de avaliação:
  - Habilitar avaliação
  - Tornar obrigatória
  - Definir pontuação mínima
  - Definir máximo de tentativas
- Editor de questões de múltipla escolha:
  - Texto da pergunta
  - URLs de mídia (imagem, vídeo, áudio)
  - Múltiplas opções
  - Marcar resposta correta

**Métricas** (`/admin/courses/:id/metrics`)

- Visão geral:
  - Total de inscritos
  - Total de conclusões
  - Taxa de conclusão
  - Nota média geral
- Métricas por step:
  - Total de tentativas
  - Usuários únicos
  - Nota média
  - Taxa de aprovação
  - Média de tentativas até passar
- Lista de usuários:
  - Progresso individual
  - Data de início
  - Status (Concluído/Em andamento)
  - Barra de progresso visual

#### Para Usuários

**Lista de Cursos** (`/courses`)

- Visualização de cursos publicados
- Descrição de cada curso
- Botão para iniciar

**Interface do Curso** (`/courses/:id`)

- Barra de progresso visual
- Exibição de conteúdo do step:
  - Texto explicativo
  - Imagens
  - Vídeos
  - Áudios
- Sistema de avaliação:
  - Questões de múltipla escolha
  - Exibição de mídia nas questões
  - Controle de tentativas
  - Feedback imediato após submissão
  - Histórico de tentativas anteriores
  - Indicador de tentativas restantes
- Navegação entre steps
- Bloqueio de progresso se avaliação obrigatória não for aprovada
- Mensagem de conclusão ao finalizar curso

### 3. Banco de Dados

#### Tabelas Criadas

**courses**

- id, title, description
- created_by, is_published
- created_at, updated_at

**course_steps**

- id, course_id, order_index
- title, content
- image_url, video_url, audio_url
- has_evaluation, evaluation_required
- min_score, max_attempts
- created_at, updated_at

**evaluation_questions**

- id, step_id, order_index
- question_text
- question_image_url, question_video_url, question_audio_url
- created_at

**question_options**

- id, question_id
- option_text, is_correct, order_index
- created_at

**user_course_progress**

- id, user_id, course_id
- current_step_id, completed
- started_at, completed_at

**user_step_attempts**

- id, user_id, step_id
- attempt_number, score, total_questions
- passed, answers (JSONB)
- attempted_at

#### Row Level Security (RLS)

- Usuários veem apenas cursos publicados
- Admins têm acesso completo
- Usuários veem apenas seu próprio progresso
- Admins podem ver progresso de todos usuários

## Recursos Principais

### Tipos de Mídia Suportados

- **Imagens** - URL da imagem
- **Vídeos** - URL do vídeo (player HTML5)
- **Áudios** - URL do áudio (player HTML5)
- **Texto** - Conteúdo rico em markdown

### Sistema de Avaliação

- **Questões de múltipla escolha** com suporte a mídia
- **Avaliações opcionais** - usuário pode pular
- **Avaliações obrigatórias** - deve atingir pontuação mínima
- **Controle de tentativas** - limite configurável por step
- **Feedback imediato** - mostra resultado após cada tentativa
- **Histórico de tentativas** - usuário vê suas tentativas anteriores

### Sistema de Progresso

- **Rastreamento automático** - salva progresso em tempo real
- **Continuidade** - usuário pode sair e voltar onde parou
- **Certificado de conclusão** - registro de conclusão do curso

### Métricas e Analytics

- **Métricas gerais do curso** - inscritos, conclusões, taxas
- **Métricas por step** - dificuldade, taxa de aprovação
- **Métricas por usuário** - progresso individual detalhado
- **Identificação de gargalos** - steps com baixa taxa de aprovação

## Como Usar

### Para Administradores

1. **Criar Curso**

   - Acesse `/admin/courses`
   - Clique em "Criar Novo Curso"
   - Preencha título e descrição
   - Marque "Publicar" quando pronto

2. **Adicionar Steps**

   - No editor do curso, clique "+ Adicionar Step"
   - Defina ordem, título e conteúdo
   - Adicione URLs de mídia conforme necessário
   - Configure avaliação se necessário

3. **Criar Avaliações**

   - No editor de step, habilite avaliação
   - Marque como obrigatória se necessário
   - Defina pontuação mínima e máximo de tentativas
   - Adicione questões com opções
   - Marque as respostas corretas

4. **Acompanhar Métricas**
   - Acesse métricas do curso
   - Analise taxas de conclusão
   - Identifique steps problemáticos
   - Acompanhe progresso dos usuários

### Para Usuários

1. **Navegar Cursos**

   - Acesse `/courses`
   - Escolha um curso de interesse
   - Clique para ver detalhes

2. **Fazer Curso**

   - Clique "Iniciar Curso"
   - Leia o conteúdo de cada step
   - Assista vídeos/áudios quando disponíveis
   - Complete avaliações quando presentes
   - Navegue entre steps

3. **Completar Avaliações**
   - Leia cada questão com atenção
   - Selecione uma resposta por questão
   - Clique "Enviar Respostas"
   - Veja seu resultado
   - Tente novamente se necessário

## Arquivos Criados/Modificados

### Backend

- `supabase/migrations/004_create_courses_system.sql` - Schema do banco
- `backend/src/types.ts` - Tipos TypeScript
- `backend/src/routes/courses-admin.ts` - Rotas admin
- `backend/src/routes/courses.ts` - Rotas usuário
- `backend/src/routes/courses-metrics.ts` - Rotas métricas
- `backend/src/main.ts` - Registro das rotas

### Frontend

- `frontend/lib/types.ts` - Tipos TypeScript
- `frontend/lib/api.ts` - Funções de API
- `frontend/app/admin/courses/page.tsx` - Lista de cursos admin
- `frontend/app/admin/courses/create/page.tsx` - Criar curso
- `frontend/app/admin/courses/[id]/edit/page.tsx` - Editar curso
- `frontend/app/admin/courses/[id]/steps/create/page.tsx` - Criar step
- `frontend/app/admin/courses/[id]/steps/[stepId]/edit/page.tsx` - Editar step
- `frontend/app/admin/courses/[id]/metrics/page.tsx` - Métricas
- `frontend/app/courses/page.tsx` - Lista de cursos usuário
- `frontend/app/courses/[id]/page.tsx` - Interface do curso
- `frontend/components/course-editor.tsx` - Editor de curso
- `frontend/components/step-editor.tsx` - Editor de step

## Próximos Passos

1. **Executar Migration**

   ```bash
   # Conectar ao Supabase e executar:
   supabase/migrations/004_create_courses_system.sql
   ```

2. **Testar Backend**

   ```bash
   cd backend
   npm run dev
   ```

3. **Testar Frontend**

   ```bash
   cd frontend
   npm run dev
   ```

4. **Criar Primeiro Curso**
   - Login como admin
   - Acesse `/admin/courses`
   - Crie um curso de teste

## Observações Técnicas

- Todas as URLs de mídia são armazenadas como strings
- Suporte a qualquer provedor de mídia (YouTube, Vimeo, S3, etc.)
- Sistema completamente tipado com TypeScript
- Validações tanto no frontend quanto backend
- RLS configurado para segurança
- Índices otimizados para performance
- Suporte a tentativas ilimitadas quando `max_attempts` é NULL

## Suporte

Para dúvidas ou problemas:

1. Verifique os logs do backend
2. Verifique console do navegador
3. Verifique políticas RLS no Supabase
4. Verifique se migration foi executada corretamente
