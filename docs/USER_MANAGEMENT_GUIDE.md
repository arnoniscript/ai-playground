# Guia de Gerenciamento de Usuários

## Visão Geral

O sistema de gerenciamento de usuários permite que administradores controlem totalmente o acesso e as permissões dos usuários na plataforma.

## Funcionalidades

### 1. Visualizar Usuários

**Acesso:** `/admin/users`

Visualize todos os usuários com:

- Nome completo
- Email
- Role (admin, tester, client)
- Status (ativo, convite pendente, bloqueado)
- Data de criação
- Último login

### 2. Filtros e Busca

- **Busca por texto:** Filtra por email ou nome
- **Filtro por Role:** admin, tester, client ou todos
- **Filtro por Status:** ativo, convite pendente, bloqueado ou todos

### 3. Convidar Usuários

**Botão:** "Convidar Usuário" (canto superior direito)

**Campos:**

- Email (obrigatório)
- Nome completo (opcional)
- Role (padrão: tester)

**Fluxo:**

1. Admin clica em "Convidar Usuário"
2. Preenche email e opcionalmente nome e role
3. Sistema cria usuário com status `pending_invite`
4. Email de convite é enviado (quando sistema de email estiver configurado)
5. Usuário completa cadastro via link no email

### 4. Editar Usuários

**Botão:** "Editar" (na linha do usuário)

**Campos editáveis:**

- Nome completo
- Role (admin, tester, client)

**Campos NÃO editáveis:**

- Email (identificador único)

**Restrições:**

- Admins podem editar qualquer usuário
- Mudança de role é imediata

### 5. Bloquear Usuários

**Botão:** "Bloquear" (na linha do usuário)

**Campos:**

- Motivo do bloqueio (opcional)

**Comportamento:**

- Usuário bloqueado não pode fazer login
- Sessões ativas são invalidadas no próximo request
- Usuário vê mensagem de "Conta bloqueada" ao tentar acessar
- Admin pode ver motivo do bloqueio no modal de edição

**Restrições:**

- Admin não pode bloquear a si mesmo
- Admin não pode bloquear outros admins (proteção de segurança)

### 6. Desbloquear Usuários

**Botão:** "Desbloquear" (aparece se usuário estiver bloqueado)

**Comportamento:**

- Remove bloqueio imediatamente
- Usuário pode fazer login novamente
- Limpa campos: blocked_at, blocked_by, blocked_reason
- Restaura status para `active`

### 7. Gerenciar Convites Pendentes

Para usuários com status `pending_invite`, **três ações especiais** estão disponíveis na tabela:

#### 7.1. 📧 Reenviar Convite

- **Ação:** Envia novamente o email de convite
- **Quando usar:** Usuário não recebeu o email, email caiu no spam, ou expirou
- **Comportamento:** Atualiza timestamp `invited_at` e dispara novo email
- **API:** `POST /admin/users/:id/resend-invite`

#### 7.2. 🔗 Copiar Link

- **Ação:** Copia link de convite para área de transferência
- **Formato:** `https://seu-dominio.com/login?email=usuario@example.com`
- **Quando usar:** Enviar convite via WhatsApp, Slack, Teams ou outro canal
- **Comportamento:** Copia para clipboard, não requer envio de email
- **Vantagem:** Garante que usuário receberá o link mesmo com problemas de email

#### 7.3. ❌ Cancelar Convite

- **Ação:** Remove usuário do sistema completamente
- **Quando usar:** Convite enviado por engano, email incorreto, ou convite não é mais necessário
- **Comportamento:**
  - Pede confirmação antes de executar
  - Deleta registro do usuário
  - **Ação irreversível** - para reconvidar será necessário criar novo convite
- **API:** `DELETE /admin/users/:id/cancel-invite`

**Nota:** Essas ações aparecem APENAS para usuários pendentes. Usuários ativos ou bloqueados têm ações diferentes (Editar/Bloquear).

## Tipos de Usuário (Roles)

### Admin

- Acesso completo ao sistema
- Pode gerenciar usuários
- Pode gerenciar playgrounds
- Pode ver todas as métricas
- Pode alterar configurações do sistema

### Tester

- Acesso a todos os playgrounds públicos
- Pode avaliar playgrounds
- Pode ver suas próprias avaliações
- Não pode gerenciar usuários ou playgrounds

### Client

- Acesso **APENAS** aos playgrounds que estão explicitamente autorizados
- Mesmo playgrounds públicos requerem autorização prévia
- Pode avaliar playgrounds autorizados
- Acesso mais restrito da plataforma

## Status de Usuário

### Active (Ativo)

- Usuário com cadastro completo
- Pode fazer login normalmente
- Tem acesso conforme sua role

### Pending Invite (Convite Pendente)

- Usuário convidado mas não completou cadastro
- Não pode fazer login
- Aguardando ação do usuário via email

### Blocked (Bloqueado)

- Conta bloqueada por admin
- Não pode fazer login
- Tentativas de acesso retornam 403 Forbidden
- Middleware bloqueia todas as requisições

## Fluxo de Autenticação com Bloqueio

1. **Login:** Usuário faz login com email/OTP
2. **Token JWT:** Sistema gera token com ID do usuário
3. **Middleware:** Em cada request:
   - Valida JWT token
   - Busca usuário completo no banco
   - **Verifica status:** Se `blocked`, retorna 403
   - Se `active`, permite acesso
4. **Response:** Usuário bloqueado vê mensagem de erro

## API Endpoints

### GET /admin/users

Lista todos os usuários com detalhes completos

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "Nome do Usuário",
      "role": "tester",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z",
      "invited_by": "admin-uuid",
      "invited_at": "2024-01-01T00:00:00Z",
      "blocked_by": null,
      "blocked_at": null,
      "blocked_reason": null
    }
  ]
}
```

### PUT /admin/users/:id

Atualiza dados do usuário

**Body:**

```json
{
  "full_name": "Novo Nome",
  "role": "client"
}
```

**Validações:**

- Email não pode ser alterado
- Role deve ser válida (admin, tester, client)

### POST /admin/users/invite

Convida novo usuário

**Body:**

```json
{
  "email": "novo@example.com",
  "full_name": "Nome Opcional",
  "role": "tester"
}
```

**Comportamento:**

- Cria usuário com status `pending_invite`
- Registra quem convidou (invited_by)
- Envia email de convite (se configurado)

### PUT /admin/users/:id/block

Bloqueia usuário

**Body:**

```json
{
  "reason": "Motivo do bloqueio (opcional)"
}
```

**Validações:**

- Não pode bloquear a si mesmo
- Não pode bloquear outros admins
- Status deve ser `active`

### PUT /admin/users/:id/unblock

Desbloqueia usuário

**Comportamento:**

- Remove bloqueio
- Restaura status para `active`
- Limpa campos de bloqueio

### POST /admin/users/:id/resend-invite

Reenvia email de convite para usuário pendente

**Validações:**

- Usuário deve existir
- Status deve ser `pending_invite`

**Comportamento:**

- Envia novo email de convite
- Atualiza `invited_at` com timestamp atual
- Retorna sucesso ou erro de envio

**Response:**

```json
{
  "message": "Invitation email resent successfully",
  "email_sent": true
}
```

### DELETE /admin/users/:id/cancel-invite

Cancela convite pendente (remove usuário)

**Validações:**

- Usuário deve existir
- Status deve ser `pending_invite`

**Comportamento:**

- Deleta usuário do sistema
- Ação irreversível

**Response:**

```json
{
  "message": "Invitation cancelled successfully",
  "deleted_email": "usuario@example.com"
}
```

## Segurança

### Proteções Implementadas

1. **Autenticação JWT:** Todas as rotas requerem token válido
2. **Role-based Access:** Apenas admins acessam rotas de gerenciamento
3. **Middleware de Bloqueio:** Verifica status em cada request
4. **Validação de Input:** Zod valida todos os dados de entrada
5. **Prevenção de Auto-bloqueio:** Admin não pode bloquear a si mesmo
6. **Proteção de Admins:** Admin não pode bloquear outros admins
7. **Email Imutável:** Identificador não pode ser alterado

### Recomendações

- **Auditoria:** Todos os bloqueios registram quem e quando
- **Motivo:** Sempre forneça motivo ao bloquear usuário
- **Comunicação:** Informe o usuário antes de bloquear
- **Backup de Admins:** Mantenha múltiplos admins ativos
- **Logs:** Monitore tentativas de login de usuários bloqueados

## Troubleshooting

### Usuário não consegue fazer login após desbloqueio

- Verificar se status está realmente `active`
- Limpar cache do navegador
- Gerar novo token JWT

### Admin bloqueado acidentalmente

- Use Supabase SQL Editor para restaurar:

```sql
UPDATE users
SET status = 'active',
    blocked_at = NULL,
    blocked_by = NULL,
    blocked_reason = NULL
WHERE email = 'admin@example.com';
```

### Convite não recebido

- Verificar configuração de email (EMAIL_SETUP_GUIDE.md)
- Verificar se status está `pending_invite`
- Usuário pode completar cadastro manualmente via login OTP

## Migrações Relacionadas

- `006_add_client_role_and_authorizations.sql` - Adiciona role client
- `008_add_user_management_fields.sql` - Adiciona campos de status e bloqueio

## Próximas Melhorias

- [ ] Sistema de notificação por email (convites, bloqueios)
- [ ] Logs de auditoria de ações administrativas
- [ ] Filtro por data de criação
- [ ] Exportação de lista de usuários (CSV)
- [ ] Histórico de alterações de role
- [ ] Bloqueio temporário com expiração automática
