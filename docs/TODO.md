# TODO - Funcionalidades Não Implementadas

Este documento lista as funcionalidades que precisam ser completadas para ter um sistema totalmente funcional.

## 🔴 Prioridade Alta (MVP)

### 1. Componente de Formulário Dinâmico (Frontend)

**Localização**: `frontend/components/evaluation-form.tsx`
**Responsabilidade**: Renderizar questões dinamicamente com:

- Select questions com opções
- Input string para respostas abertas
- Validação de campos obrigatórios
- Submissão de respostas

**Exemplo de uso**:

```tsx
<EvaluationForm
  questions={playground.questions}
  onSubmit={handleSubmit}
  loading={isSubmitting}
/>
```

### 2. Componente de Renderização de Modelo (Frontend)

**Localização**: `frontend/components/model-embed.tsx`
**Responsabilidade**:

- Renderizar script Eleven Labs sem sanitizar
- Renderizar iframe
- Gerenciar lifecycle do embed

**Exemplo**:

```tsx
<ModelEmbed embedCode={model.embed_code} modelKey={model.model_key} />
```

### 3. Página de Avaliação do Tester (Frontend)

**Localização**: `frontend/app/playground/[id]/page.tsx`
**Responsabilidade**:

- Buscar playground e modelos
- Para A/B: mostrar modelo, perguntas, depois outro modelo
- Para Tuning: mostrar modelo único, permitir múltiplas avaliações
- Rastrear progresso
- Desabilitar quando limite atingido

### 4. Página de Criação de Playground (Frontend)

**Localização**: `frontend/app/admin/create-playground/page.tsx`
**Responsabilidade**:

- Form para criar novo playground
- Adicionar modelos (A/B ou Tuning)
- Editor de perguntas com drag-drop
- Preview do suporte_text (HTML)

### 5. Página de Detalhes e Edição (Frontend)

**Localização**: `frontend/app/admin/playground/[id]/page.tsx`
**Responsabilidade**:

- Exibir detalhes do playground
- Editar nome, descrição, support_text
- Gerenciar questões (add, edit, delete, reorder)
- Ativar/desativar playground

### 6. Dashboard de Métricas (Frontend)

**Localização**: `frontend/app/admin/playground/[id]/metrics/page.tsx`
**Responsabilidade**:

- Exibir cards com:
  - Status (em andamento/finalizado)
  - Total de avaliações
  - Avaliações por modelo
  - Total de avaliadores únicos
- Gráficos (Recharts) para:
  - Distribuição de respostas (select questions)
  - Progresso ao longo do tempo
- Tabela de respostas abertas (input_string)

**Exemplo de métrica**:

```json
{
  "status": "in_progress",
  "total_evaluations": 42,
  "model_a_evaluations": 21,
  "model_b_evaluations": 21,
  "unique_testers": 12,
  "question_responses": [
    {
      "question": "Helpfulness",
      "very_helpful": { "count": 28, "percentage": 66.7 },
      "somewhat_helpful": { "count": 10, "percentage": 23.8 },
      "not_helpful": { "count": 4, "percentage": 9.5 }
    }
  ]
}
```

## 🟡 Prioridade Média (Polimento)

### 7. Email Real para OTP

**Localização**: `backend/src/utils/email.ts`
**Implementar**:

- SendGrid integration (ou AWS SES)
- Template HTML para email OTP
- Resend logic

**Código**:

```typescript
import sgMail from "@sendgrid/mail";

export async function sendOTP(email: string, otp: string) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  await sgMail.send({
    to: email,
    from: "noreply@marisa.care",
    subject: "Seu código de acesso - AI Marisa Playground",
    html: `<h2>Código: ${otp}</h2><p>Válido por 10 minutos</p>`,
  });
}
```

### 8. Rate Limiting

**Localização**: `backend/src/middleware/rateLimit.ts`
**Implementar**:

- Limit OTP requests (3 por email / 15 min)
- Limit login attempts (5 fails / 15 min)
- General API rate limiting

### 9. Componentes UI Melhorados

- Button com loading state
- Form validation visual
- Toast notifications
- Modal dialogs
- Loading skeletons

### 10. Página 404 e Error Boundaries

**Localização**: `frontend/app/error.tsx`, `frontend/app/not-found.tsx`

## 🟢 Prioridade Baixa (Nice-to-have)

### 11. Exportação de Dados

**Localização**: `frontend/app/admin/playground/[id]/export/page.tsx`

- Export como CSV
- Export como JSON
- Export com gráficos (PDF)

### 12. Teste A/B com Contrabalanceamento

Atualmente usa sorteio aleatório. Pode implementar:

- Latinize square para melhor distribuição
- Track que usuário viu qual modelo
- Garantir exatamente X avaliações por modelo

### 13. Admin Management

- Listar/convidar usuarios
- Promover para admin
- Revogar permissões
- User activity log

### 14. Playground Templates

Templates pré-feitos para casos comuns:

- Customer Service Bot
- Content Generation
- Code Assistant

### 15. Análise Avançada

- Sentiment analysis nas respostas
- Clustering de respostas similares
- Exportar dados para tools de análise

## 📋 Checklist de Implementação

### Backend (Express)

- [ ] Email OTP real
- [ ] Rate limiting
- [ ] Error handling melhorado
- [ ] Input validation mais rigorosa
- [ ] Testes unitários
- [ ] Documentação OpenAPI/Swagger

### Frontend (Next.js)

- [ ] Componentes de avaliação
- [ ] Dashboard admin completo
- [ ] Páginas de criação/edição
- [ ] Componentes UI reutilizáveis
- [ ] Loading states e error handling
- [ ] Testes visuais

### DevOps

- [ ] GitHub Actions CI/CD
- [ ] Environment management
- [ ] Monitoring e alertas
- [ ] Backup strategy

### Documentação

- [ ] User guide (admin/tester)
- [ ] Developer guide
- [ ] API documentation
- [ ] Video tutorial

## 🚀 Ordem de Priorização Recomendada

1. **Componentes de avaliação** (3. + 2.) - Sem isso usuários não conseguem usar
2. **Dashboard métricas** (6.) - Admin precisa ver dados
3. **Criação de playground** (4. + 5.) - Admin precisa criar conteúdo
4. **Email real** (7.) - Produção precisa
5. **Rate limiting** (8.) - Segurança
6. **Componentes UI** (9.) - Polimento
7. Resto - Basado em feedback

## 📝 Notas para Desenvolvimento

### Componente de Formulário

```typescript
// Estrutura esperada
interface EvaluationFormProps {
  questions: Question[];
  modelKey: string;
  onSubmit: (answers: Answer[]) => Promise<void>;
  loading?: boolean;
}
```

### Integração com Eleven Labs

```typescript
// Safe HTML render
dangerouslySetInnerHTML={{ __html: model.embed_code }}

// Alternativa: React component parser
import ReactHtmlParser from 'react-html-parser';
ReactHtmlParser(model.embed_code)
```

### Handling de Estado complexo

Considere usar Zustand ou Context para:

- Estado do playground atual
- Respostas do formulário
- Progresso do usuário
- Estado da alternância A/B

### Performance

- Lazy load modelos
- Memoize componentes pesados
- Paginate avaliações no dashboard
- Cache de playgrounds disponíveis

## 🔗 Dependências Sugeridas

```json
{
  "recharts": "^2.10.0",
  "react-hook-form": "^7.48.0",
  "zod": "^3.22.0",
  "zustand": "^4.4.0",
  "clsx": "^2.0.0",
  "framer-motion": "^10.16.0",
  "lucide-react": "^0.298.0",
  "html-react-parser": "^5.0.0"
}
```
