# Implementação: Role "Client" com Controle de Acesso Explícito

## 📋 Resumo

Foi implementado o role "client" que permite criar usuários com acesso restrito a playgrounds específicos. Ao contrário de outros roles (admin, tester), clients **SEMPRE** precisam de autorização explícita para acessar playgrounds, mesmo que sejam públicos.

## 🗃️ Estrutura do Banco de Dados

### Migration 006: `006_add_client_role_and_authorizations.sql`

**Novidades:**

1. **Enum `user_role` expandido:**

   - `admin` - Acesso total
   - `tester` - Usuário padrão (acesso baseado em regras do playground)
   - `client` - ✨ **NOVO** - Acesso apenas a playgrounds autorizados

2. **Tabela `playground_authorized_users`:**

   ```sql
   - id (UUID)
   - playground_id (FK → playgrounds)
   - user_id (FK → users)
   - authorized_by (FK → users, quem autorizou)
   - authorized_at (timestamp)
   - notes (texto opcional)
   ```

3. **Campo `access_control_type` em `playgrounds`:**

   - `open` - Aberto para todos (exceto clients)
   - `email_restricted` - Lista de emails (campo `restricted_emails`)
   - `explicit_authorization` - Apenas usuários na tabela `playground_authorized_users`

4. **Views úteis:**
   - `playground_access_list` - Lista de usuários autorizados por playground
   - `user_playground_access` - Lista de playgrounds acessíveis por usuário

## 🔒 Lógica de Controle de Acesso

### Backend: `utils/playground-access.ts`

**Funções principais:**

1. **`userHasPlaygroundAccess(userId, playgroundId, userRole, userEmail)`**

   - Verifica se usuário tem acesso a um playground específico
   - Admins: sempre tem acesso
   - Clients: SEMPRE verifica tabela `playground_authorized_users`
   - Testers: baseado no `access_control_type` do playground

2. **`getUserAccessiblePlaygrounds(userId, userRole, userEmail)`**

   - Retorna lista de IDs de playgrounds acessíveis
   - Usado na listagem de playgrounds

3. **`authorizeUserForPlayground(playgroundId, userId, authorizedBy, notes)`**

   - Adiciona autorização de usuário

4. **`removeUserAuthorizationFromPlayground(playgroundId, userId)`**

   - Remove autorização de usuário

5. **`getPlaygroundAuthorizedUsers(playgroundId)`**
   - Lista usuários autorizados com detalhes

### Rotas Atualizadas

**Playgrounds (`routes/playgrounds.ts`):**

- `GET /playgrounds` - Lista apenas playgrounds acessíveis ao usuário
- `GET /playgrounds/:id` - Verifica acesso antes de retornar detalhes
- `POST /playgrounds/:id/evaluations` - Valida acesso antes de submeter

**Admin (`routes/admin.ts`):**

- `GET /admin/playgrounds/:id/authorized-users` - Lista usuários autorizados
- `POST /admin/playgrounds/:id/authorized-users` - Adiciona autorização
  ```json
  Body: { "user_id": "uuid", "notes": "opcional" }
  ```
- `DELETE /admin/playgrounds/:id/authorized-users/:userId` - Remove autorização
- `PUT /admin/playgrounds/:id/access-control` - Altera modo de controle
  ```json
  Body: { "access_control_type": "open|email_restricted|explicit_authorization" }
  ```

## 🎨 Interface Admin

### Página: `/admin/playground-access`

**Componente principal:** `PlaygroundAccessManager`

**Funcionalidades:**

- ✅ Listar todos os playgrounds
- ✅ Filtrar playgrounds por nome
- ✅ Selecionar playground para gerenciar
- ✅ Alterar modo de controle de acesso (dropdown)
- ✅ Adicionar usuários autorizados
- ✅ Remover usuários autorizados
- ✅ Visualizar detalhes de autorização (data, quem autorizou, notas)

**Interface intuitiva:**

- Coluna esquerda: Lista de playgrounds com badges de status
- Coluna direita: Gerenciamento de acesso do playground selecionado

## 🧪 Como Testar

### 1. Aplicar a Migration

```bash
# No Supabase Studio ou via CLI
psql $DATABASE_URL -f supabase/migrations/006_add_client_role_and_authorizations.sql
```

Ou pelo Supabase Dashboard:

1. Acesse SQL Editor
2. Cole o conteúdo de `006_add_client_role_and_authorizations.sql`
3. Execute

### 2. Criar Usuário Client (via Supabase)

**Opção A - SQL direto:**

```sql
INSERT INTO users (email, full_name, role)
VALUES ('client@teste.com', 'Cliente Teste', 'client');
```

**Opção B - Via signup endpoint:**

```bash
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "client@marisa.care"}'
```

Depois, atualizar o role manualmente:

```sql
UPDATE users SET role = 'client' WHERE email = 'client@marisa.care';
```

### 3. Autorizar Client em Playground

**Via Interface Admin:**

1. Login como admin
2. Acesse `/admin/playground-access`
3. Selecione um playground
4. No dropdown, adicione o usuário client
5. Opcionalmente adicione notas
6. Clique em "Adicionar Autorização"

**Via API:**

```bash
curl -X POST http://localhost:3001/admin/playgrounds/{playground_id}/authorized-users \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "{client_user_id}",
    "notes": "Cliente do projeto X"
  }'
```

### 4. Validar Acesso do Client

**Login como client:**

```bash
# 1. Solicitar OTP
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "client@marisa.care"}'

# 2. Verificar OTP (código recebido por email)
curl -X POST http://localhost:3001/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "client@marisa.care", "otp": "123456"}'
```

**Listar playgrounds acessíveis:**

```bash
curl http://localhost:3001/playgrounds \
  -H "Authorization: Bearer {client_token}"
```

**Resultado esperado:**

- Client vê APENAS playgrounds em que foi autorizado
- Playgrounds públicos NÃO aparecem (a menos que autorizado)
- Acesso negado se tentar acessar playground não autorizado

### 5. Testar Diferentes Cenários

**Cenário 1: Playground Open + Client**

```
- Playground: access_control_type = 'open'
- Client: NÃO autorizado
- Resultado: ❌ Client NÃO vê o playground
```

**Cenário 2: Playground Open + Client Autorizado**

```
- Playground: access_control_type = 'open'
- Client: Autorizado via playground_authorized_users
- Resultado: ✅ Client vê e acessa o playground
```

**Cenário 3: Playground Explicit Authorization + Tester**

```
- Playground: access_control_type = 'explicit_authorization'
- Tester: NÃO autorizado
- Resultado: ❌ Tester NÃO vê o playground
```

**Cenário 4: Playground Email Restricted + Client**

```
- Playground: access_control_type = 'email_restricted', restricted_emails = ['client@teste.com']
- Client: Email na lista, mas SEM autorização explícita
- Resultado: ❌ Client NÃO vê (clients ignoram restricted_emails)
```

## 📊 Queries Úteis para Debug

### Ver autorizações de um playground

```sql
SELECT
  pau.*,
  u.email as user_email,
  u.role as user_role,
  authorizer.email as authorized_by_email
FROM playground_authorized_users pau
JOIN users u ON pau.user_id = u.id
LEFT JOIN users authorizer ON pau.authorized_by = authorizer.id
WHERE pau.playground_id = 'SEU_PLAYGROUND_ID';
```

### Ver todos os playgrounds de um usuário

```sql
SELECT * FROM user_playground_access
WHERE user_id = 'SEU_USER_ID' AND has_access = true;
```

### Contar clients por playground

```sql
SELECT
  p.name,
  COUNT(pau.id) as total_authorized_clients
FROM playgrounds p
LEFT JOIN playground_authorized_users pau ON p.id = pau.playground_id
LEFT JOIN users u ON pau.user_id = u.id AND u.role = 'client'
GROUP BY p.id, p.name;
```

## 🔍 Verificação de Tipos

### Backend

```typescript
// types.ts
export type UserRole = "admin" | "tester" | "client";
export type AccessControlType =
  | "open"
  | "email_restricted"
  | "explicit_authorization";

export interface PlaygroundAuthorizedUser {
  id: string;
  playground_id: string;
  user_id: string;
  authorized_by: string | null;
  authorized_at: string;
  notes: string | null;
}
```

### Frontend

```typescript
// lib/types.ts
export type UserRole = 'admin' | 'tester' | 'client';
export type AccessControlType = 'open' | 'email_restricted' | 'explicit_authorization';

export interface PlaygroundAuthorizedUser {
  // ... mesma estrutura do backend
  user?: { ... }; // populated
  authorizer?: { ... }; // populated
}
```

## ⚠️ Considerações Importantes

1. **Clients SEMPRE precisam de autorização explícita:**

   - Mesmo playgrounds "open" não aparecem para clients não autorizados
   - Isso garante controle total sobre acesso de clientes

2. **Admins têm acesso irrestrito:**

   - Não precisam estar na lista de autorizações
   - Podem ver e acessar qualquer playground

3. **Backward Compatibility:**

   - Playgrounds existentes ficam como `access_control_type = 'open'`
   - Playgrounds com `restricted_emails` são marcados como `email_restricted`
   - Comportamento de testers não muda

4. **RLS Policies:**
   - Policies do Supabase protegem a tabela `playground_authorized_users`
   - Backend usa service key, então bypass RLS
   - Policies são camada adicional de segurança

## 🚀 Próximos Passos

1. **Criar interface de signup para clients** (futuro: QA role)
2. **Adicionar notificações** quando client é autorizado
3. **Dashboard de clients** mostrando seus playgrounds autorizados
4. **Bulk authorization** - autorizar múltiplos usuários de uma vez
5. **Expiração de acesso** - campo `expires_at` em autorizações
6. **Audit log** - registrar todas as mudanças de autorização

## 📝 Checklist de Implementação

- ✅ Migration criada e aplicada
- ✅ Types atualizados (backend + frontend)
- ✅ Middleware de autorização atualizado
- ✅ Rotas de playgrounds refatoradas
- ✅ Funções utilitárias de acesso criadas
- ✅ Rotas admin para gerenciar autorizações
- ✅ Componente PlaygroundAccessManager criado
- ✅ Página admin de controle de acesso
- ✅ Documentação completa
- 🔲 Testes end-to-end executados
- 🔲 Deploy em staging/produção

## 🐛 Troubleshooting

**Problema:** Client não vê playgrounds autorizados

- Verificar se autorização foi criada: `SELECT * FROM playground_authorized_users WHERE user_id = '...'`
- Verificar se playground está ativo: `is_active = true`
- Verificar se token JWT tem role correto

**Problema:** Erro ao adicionar autorização

- Verificar se usuário existe
- Verificar se playground existe
- Verificar se não é duplicata (UNIQUE constraint)

**Problema:** Admin não consegue alterar access_control_type

- Verificar se é realmente admin
- Verificar se playground_id é válido
- Verificar logs do backend

## 📞 Suporte

Em caso de dúvidas ou problemas:

1. Verificar logs do backend: `console.error` nas rotas
2. Verificar SQL queries no Supabase Dashboard
3. Testar endpoints via Postman/curl antes de usar frontend
4. Verificar types TypeScript (não deveria haver erros de compilação)
