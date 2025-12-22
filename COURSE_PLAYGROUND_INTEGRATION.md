# Vinculação de Cursos Introdutórios aos Playgrounds

## Visão Geral

Sistema completo para vincular cursos introdutórios aos playgrounds, permitindo que administradores configurem cursos como obrigatórios ou opcionais, e oferecendo aos usuários uma experiência integrada de aprendizado.

## Funcionalidades Implementadas

### 1. **Database Migration**

**Arquivo**: `/supabase/migrations/005_link_courses_to_playgrounds.sql`

Adiciona dois campos à tabela `playgrounds`:

- `linked_course_id` (UUID, nullable): Referência ao curso vinculado
- `course_required` (BOOLEAN): Define se o curso é obrigatório para acessar o playground

### 2. **Backend - API Updates**

#### Tipos Atualizados

**Arquivo**: `/backend/src/types.ts`

- Interface `Playground` agora inclui `linked_course_id` e `course_required`

#### Endpoint de Playground

**Arquivo**: `/backend/src/routes/playgrounds.ts`

- `GET /playgrounds/:id`: Retorna informações adicionais:
  - `linked_course`: Dados do curso vinculado (título, descrição)
  - `user_course_progress`: Progresso do usuário no curso
  - `course_access_blocked`: Boolean indicando se o acesso está bloqueado

**Lógica de Bloqueio**:

```typescript
// Bloqueia acesso se:
- Playground tem curso vinculado (linked_course_id)
- Curso é obrigatório (course_required = true)
- Usuário não completou o curso (!progress.completed)
```

### 3. **Frontend - Admin**

#### Formulário de Criação de Playground

**Arquivo**: `/frontend/app/admin/create-playground/page.tsx`

**Nova Seção**: "Curso Introdutório (Opcional)"

- **Select**: Lista todos os cursos publicados
- **Checkbox**: "Curso obrigatório"
  - Se marcado: Usuários DEVEM completar o curso antes de acessar
  - Se desmarcado: Curso é sugerido mas não obrigatório

**Estado Adicionado**:

```typescript
const [linkedCourseId, setLinkedCourseId] = useState<string>("");
const [courseRequired, setCourseRequired] = useState<boolean>(false);
const [availableCourses, setAvailableCourses] = useState<any[]>([]);
```

**Payload de Criação**:

```typescript
{
  ...playgroundData,
  linked_course_id: linkedCourseId || null,
  course_required: courseRequired
}
```

### 4. **Frontend - Visualização do Playground**

#### Página do Playground

**Arquivo**: `/frontend/app/playground/[id]/page.tsx`

**Verificação de Acesso**:

- Se `course_access_blocked = true`: Redireciona automaticamente para o curso
- Se curso está vinculado: Mostra banner de curso

**Banner de Curso** (3 estados):

1. **Curso não iniciado** (azul):
   - Texto: "📚 Curso Introdutório Recomendado"
   - Botão: "Ver Curso"
2. **Curso concluído** (verde):

   - Texto: "✓ Curso Introdutório Concluído"
   - Botão: "Revisar Curso"
   - Mensagem: "Revise o conteúdo a qualquer momento"

3. **Curso obrigatório e concluído**:
   - Mensagem especial indicando que era obrigatório

#### Modal de Curso

**Arquivo**: `/frontend/components/course-modal.tsx`

**Características**:

- Modal fullscreen responsivo
- Navegação entre steps (anterior/próximo)
- Indicadores de progresso (bolinhas)
- Exibe conteúdo completo: texto, imagem, vídeo, áudio
- Nota sobre avaliações (informa que deve fazer no curso completo)
- Botão de fechar para voltar ao playground

**Integração**:

```typescript
const [showCourseModal, setShowCourseModal] = useState(false);

<CourseModal
  courseId={playground.linked_course.id}
  isOpen={showCourseModal}
  onClose={() => setShowCourseModal(false)}
/>;
```

### 5. **Tipos Frontend**

**Arquivo**: `/frontend/lib/types.ts`

Interface `Playground` estendida:

```typescript
{
  ...campos existentes,
  linked_course_id: string | null;
  course_required: boolean;
  linked_course?: {
    id: string;
    title: string;
    description: string | null;
    is_published: boolean;
  } | null;
  user_course_progress?: {
    user_id: string;
    course_id: string;
    started_at: string;
    completed: boolean;
    completed_at: string | null;
    current_step_id: string | null;
  } | null;
  course_access_blocked?: boolean;
}
```

## Fluxo de Usuário

### Cenário 1: Curso Obrigatório Não Concluído

1. Usuário tenta acessar playground
2. Backend detecta `course_required = true` e `!progress.completed`
3. Retorna `course_access_blocked = true`
4. Frontend redireciona automaticamente para `/courses/{courseId}`
5. Usuário completa o curso
6. Após conclusão, pode acessar o playground

### Cenário 2: Curso Obrigatório Concluído

1. Usuário acessa playground normalmente
2. Banner verde aparece: "✓ Curso Introdutório Concluído"
3. Botão "Revisar Curso" disponível
4. Ao clicar, abre modal com conteúdo do curso
5. Usuário pode revisar enquanto usa o playground

### Cenário 3: Curso Opcional

1. Usuário acessa playground normalmente
2. Banner azul aparece: "📚 Curso Introdutório Recomendado"
3. Botão "Ver Curso" disponível
4. Usuário pode ignorar e usar o playground diretamente
5. Ou pode abrir a modal para ver o curso

### Cenário 4: Sem Curso Vinculado

1. Usuário acessa playground normalmente
2. Nenhum banner de curso aparece
3. Experiência normal do playground

## Próximos Passos

1. **Executar Migration**:

```sql
-- Execute no Supabase SQL Editor
-- Arquivo: 005_link_courses_to_playgrounds.sql
```

2. **Testar Fluxo Completo**:

   - Criar curso e publicar
   - Criar playground vinculando curso
   - Testar com curso obrigatório
   - Testar com curso opcional
   - Verificar redirecionamento
   - Testar modal de revisão

3. **Validar Experiência**:
   - Banner está visível e claro
   - Modal funciona sem travar o playground
   - Navegação entre steps fluida
   - Redirecionamento funciona corretamente

## Arquivos Modificados/Criados

### Database

- ✅ `/supabase/migrations/005_link_courses_to_playgrounds.sql`

### Backend

- ✅ `/backend/src/types.ts`
- ✅ `/backend/src/routes/playgrounds.ts`

### Frontend

- ✅ `/frontend/lib/types.ts`
- ✅ `/frontend/app/admin/create-playground/page.tsx`
- ✅ `/frontend/app/playground/[id]/page.tsx`
- ✅ `/frontend/components/course-modal.tsx` (novo)
- ✅ `/frontend/components/index.ts`

## Notas Técnicas

- Modal usa position fixed com z-index 50 para sobrepor playground
- Não fecha o playground ao abrir curso (experiência integrada)
- Backend valida acesso antes de retornar dados do playground
- Redirecionamento automático para cursos obrigatórios
- Banner com cores diferentes para estados diferentes (UX clara)
- Navegação por steps dentro da modal com indicadores visuais
