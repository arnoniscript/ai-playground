# 🔐 Regras de Autenticação e Acesso

## Visão Geral

O sistema possui três regras principais de autenticação baseadas no domínio do email e status de convite.

## Regras de Acesso

### ✅ Regra 1: Usuários @marisa.care (Auto-cadastro)

**Condição:** Email com domínio `@marisa.care`

**Comportamento:**

- ✅ Acesso liberado automaticamente
- 🆕 Cadastro automático se não existir
- 👤 Role padrão: `tester`
- 📊 Status: `active`
- 📧 Recebe OTP por email
- 🔓 Não precisa de convite prévio

**Exemplo:**

```
joao.silva@marisa.care → ✅ Acesso liberado (auto-cadastro como tester)
maria.costa@marisa.care → ✅ Acesso liberado (auto-cadastro como tester)
```

### ✅ Regra 2: Usuários Convidados (Fora do domínio)

**Condição:** Email NÃO é `@marisa.care` MAS está na lista de usuários (foi convidado)

**Comportamento:**

- ✅ Acesso liberado
- 👤 Usa role definida pelo admin no convite
- 📊 Status muda de `pending_invite` → `active` no primeiro login
- 📧 Recebe OTP por email
- 🎯 Pode ser: `admin`, `tester` ou `client`
- ⚠️ Se status for `blocked`, acesso negado

**Exemplo:**

```
consultor@externa.com (convidado como client) → ✅ Acesso liberado com role client
parceiro@outrodominio.com (convidado como tester) → ✅ Acesso liberado com role tester
```

### ❌ Regra 3: Usuários Não Autorizados

**Condição:** Email NÃO é `@marisa.care` E NÃO está na lista de usuários

**Comportamento:**

- ❌ Acesso bloqueado
- 🚫 Não pode criar conta
- 📩 Recebe mensagem de erro
- 💬 Deve solicitar convite a um admin

**Exemplo:**

```
qualquer@gmail.com (não convidado) → ❌ Acesso negado
teste@hotmail.com (não convidado) → ❌ Acesso negado
```

## Fluxos de Login

### Fluxo 1: Login de Usuário Marisa (@marisa.care)

```
1. Usuário digita email: joao@marisa.care
2. Sistema valida domínio: ✅ marisa.care
3. Sistema busca no banco: não encontrado
4. Sistema cria usuário: role=tester, status=active
5. Sistema envia OTP: email enviado
6. Usuário digita OTP: verifica código
7. Login completo: token JWT gerado
8. Redirecionado: /dashboard
```

### Fluxo 2: Login de Usuário Convidado (Primeiro Acesso)

```
1. Admin convida: consultor@externa.com como client
2. Banco cria: role=client, status=pending_invite
3. Email enviado: link de convite
4. Usuário clica: abre /login?email=consultor@externa.com
5. Usuário pede OTP: email não é marisa.care
6. Sistema busca banco: encontrado! (convidado)
7. Sistema valida status: pending_invite → muda para active
8. Sistema envia OTP: email enviado
9. Usuário digita OTP: verifica código
10. Login completo: token JWT com role=client
11. Redirecionado: /dashboard (acesso limitado aos playgrounds autorizados)
```

### Fluxo 3: Tentativa de Login Não Autorizado

```
1. Usuário digita: teste@gmail.com
2. Sistema valida domínio: ❌ não é marisa.care
3. Sistema busca banco: não encontrado
4. Sistema bloqueia: status 403
5. Usuário vê erro: "Access denied - Only users from marisa.care domain or invited users can access"
```

## Mudanças de Status

### pending_invite → active

- **Quando:** Primeiro login de usuário convidado
- **Trigger:** POST /auth/signup (se usuário existe e status é pending_invite)
- **Automático:** Sim

### active → blocked

- **Quando:** Admin bloqueia usuário
- **Trigger:** PUT /admin/users/:id/block
- **Manual:** Admin executa ação

### blocked → active

- **Quando:** Admin desbloqueia usuário
- **Trigger:** PUT /admin/users/:id/unblock
- **Manual:** Admin executa ação

## Validações de Segurança

### No Signup (POST /auth/signup)

```typescript
// 1. Validação de domínio
const isMarisaDomain = email.endsWith("@marisa.care");

// 2. Busca usuário no banco
const existingUser = await findUserByEmail(email);

// 3. Aplica regras
if (!isMarisaDomain && !existingUser) {
  return 403; // Bloqueado
}

if (!isMarisaDomain && existingUser.status === "blocked") {
  return 403; // Bloqueado
}

if (!isMarisaDomain && existingUser.status === "pending_invite") {
  await updateStatus(existingUser.id, "active"); // Ativa convite
}

if (isMarisaDomain && !existingUser) {
  await createUser({ email, role: "tester", status: "active" }); // Auto-cadastro
}
```

### No Verify (POST /auth/verify)

```typescript
// Valida OTP e gera token
// Não revalidam domínio (já validado no signup)
// Atualiza last_login
```

### No Middleware (authMiddleware)

```typescript
// Valida JWT token
// Busca usuário completo
// Verifica se status === 'blocked'
// Se bloqueado: retorna 403
```

## Mensagens de Erro

### Acesso Negado (Não Autorizado)

```json
{
  "error": "Access denied",
  "message": "Only users from marisa.care domain or invited users can access this platform."
}
```

### Conta Bloqueada

```json
{
  "error": "Account blocked",
  "message": "Your account has been blocked. Please contact an administrator.",
  "blocked_at": "2024-01-08T12:00:00Z",
  "blocked_reason": "Violação de termos"
}
```

## Casos de Uso

### Caso 1: Time Interno da Marisa

- **Emails:** @marisa.care
- **Processo:** Auto-cadastro
- **Role:** tester (padrão)
- **Acesso:** Todos os playgrounds públicos

### Caso 2: Consultores Externos

- **Emails:** Qualquer domínio
- **Processo:** Convite por admin
- **Role:** client (definida no convite)
- **Acesso:** Apenas playgrounds autorizados explicitamente

### Caso 3: Parceiros de Teste

- **Emails:** Qualquer domínio
- **Processo:** Convite por admin
- **Role:** tester (definida no convite)
- **Acesso:** Todos os playgrounds públicos (igual time interno)

### Caso 4: Administradores Externos

- **Emails:** Qualquer domínio
- **Processo:** Convite por admin (outro admin)
- **Role:** admin (definida no convite)
- **Acesso:** Completo (gerenciar usuários, playgrounds, métricas)

## Tabela Resumo

| Domínio Email | Existe no DB? | Status DB      | Resultado        | Role       |
| ------------- | ------------- | -------------- | ---------------- | ---------- |
| @marisa.care  | Não           | -              | ✅ Auto-cadastro | tester     |
| @marisa.care  | Sim           | active         | ✅ Login         | role do DB |
| @marisa.care  | Sim           | blocked        | ❌ Bloqueado     | -          |
| outro         | Não           | -              | ❌ Bloqueado     | -          |
| outro         | Sim           | pending_invite | ✅ Login (ativa) | role do DB |
| outro         | Sim           | active         | ✅ Login         | role do DB |
| outro         | Sim           | blocked        | ❌ Bloqueado     | -          |

## Configuração

### Variável de Ambiente

```env
ALLOWED_EMAIL_DOMAIN=marisa.care
```

### Código (config.ts)

```typescript
export const config = {
  auth: {
    allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN || "marisa.care",
  },
};
```

## Troubleshooting

### Problema: "Access denied" para usuário convidado

- ✅ Verificar se email está no banco de dados
- ✅ Verificar status do usuário (deve ser pending_invite ou active)
- ✅ Verificar se convite não foi cancelado

### Problema: Usuário @marisa.care não consegue login

- ✅ Verificar se ALLOWED_EMAIL_DOMAIN está configurado
- ✅ Verificar se OTP está sendo enviado
- ✅ Verificar logs do backend para erros de criação de usuário

### Problema: Usuário convidado com status pending_invite após login

- ✅ Verificar se código de ativação está executando
- ✅ Forçar atualização manual via SQL:

```sql
UPDATE users SET status = 'active' WHERE email = 'usuario@example.com';
```
