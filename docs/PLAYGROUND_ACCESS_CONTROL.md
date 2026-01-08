# 🔐 Sistema de Controle de Acesso a Playgrounds

## Visão Geral

O sistema permite configurar três níveis de acesso para playgrounds, com regras especiais para a role `client`.

## Tipos de Controle de Acesso

### 1. 🌐 Open (Público)

**Configuração:** `access_control_type = 'open'`

**Acesso:**

- ✅ **Admins**: Acesso total
- ✅ **Testers**: Acesso livre
- ⚠️ **Clients**: Precisam de autorização explícita

**Caso de Uso:**

- Playground disponível para todo o time interno (@marisa.care)
- Permite autorizar consultores externos específicos (clients)
- **Exemplo**: Playground de teste de modelo de NLP aberto para testers, mas apenas consultores autorizados podem avaliar

**Vantagem:** Playground público pode ter clients específicos sem se tornar privado

### 2. 📧 Email Restricted (Restrito por Email)

**Configuração:** `access_control_type = 'email_restricted'`, `restricted_emails = ['email1@marisa.care', 'email2@marisa.care']`

**Acesso:**

- ✅ **Admins**: Acesso total
- ⚠️ **Testers**: Apenas se email estiver na lista `restricted_emails`
- ⚠️ **Clients**: Precisam de autorização explícita (ignora lista de emails)

**Caso de Uso:**

- Playground para departamento ou time específico
- Lista manual de emails autorizados
- **Exemplo**: Playground apenas para time de produtos (lista de 5 emails)

**Nota:** Clients nunca acessam por email restriction, sempre por autorização explícita

### 3. 🔒 Explicit Authorization (Autorização Explícita)

**Configuração:** `access_control_type = 'explicit_authorization'`

**Acesso:**

- ✅ **Admins**: Acesso total
- ⚠️ **Testers**: Apenas se estiverem na tabela `playground_authorized_users`
- ⚠️ **Clients**: Apenas se estiverem na tabela `playground_authorized_users`

**Caso de Uso:**

- Playground altamente restrito
- Controle granular de quem pode acessar
- Rastreamento de quem foi autorizado e por quem
- **Exemplo**: Playground confidencial de novo produto, apenas membros autorizados

## Regra Especial: Clients

**Clients SEMPRE precisam de autorização explícita, independente do tipo de acesso do playground.**

### Por quê?

Clients são usuários externos (consultores, parceiros, etc.) e precisam de controle granular de acesso. Mesmo que um playground seja público, você pode querer autorizar apenas clients específicos.

### Como funciona?

1. **Playground Open**:

   - Testers acessam livremente ✅
   - Clients precisam estar em `playground_authorized_users` ⚠️

2. **Playground Email Restricted**:

   - Testers acessam se email na lista ✅
   - Clients precisam estar em `playground_authorized_users` ⚠️

3. **Playground Explicit Authorization**:
   - Todos (testers e clients) precisam estar em `playground_authorized_users` ⚠️

## Tabela de Acesso

| Tipo                 | Admin | Tester (public) | Tester (lista)     | Client (autorizado) | Client (não autorizado) |
| -------------------- | ----- | --------------- | ------------------ | ------------------- | ----------------------- |
| **Open**             | ✅    | ✅              | ✅                 | ✅                  | ❌                      |
| **Email Restricted** | ✅    | ❌              | ✅                 | ✅ (se autorizado)  | ❌                      |
| **Explicit Auth**    | ✅    | ❌              | ✅ (se autorizado) | ✅                  | ❌                      |

## Cenários Práticos

### Cenário 1: Playground Público com Consultores

**Objetivo:** Time interno testa livremente, mas apenas 2 consultores específicos podem avaliar.

**Configuração:**

- `access_control_type = 'open'`
- Autorizar os 2 consultores em `playground_authorized_users`

**Resultado:**

- Todos testers @marisa.care: ✅ Acesso livre
- Consultor A (autorizado): ✅ Acesso
- Consultor B (autorizado): ✅ Acesso
- Consultor C (não autorizado): ❌ Sem acesso

### Cenário 2: Playground Departamental

**Objetivo:** Apenas time de marketing pode testar.

**Configuração:**

- `access_control_type = 'email_restricted'`
- `restricted_emails = ['joao@marisa.care', 'maria@marisa.care', 'pedro@marisa.care']`

**Resultado:**

- João (na lista): ✅ Acesso
- Maria (na lista): ✅ Acesso
- Carlos (não na lista): ❌ Sem acesso
- Clients: ❌ Sem acesso (a menos que autorizados explicitamente)

### Cenário 3: Playground Confidencial

**Objetivo:** Apenas membros autorizados individualmente.

**Configuração:**

- `access_control_type = 'explicit_authorization'`
- Adicionar cada pessoa em `playground_authorized_users`

**Resultado:**

- Apenas pessoas na tabela de autorização: ✅ Acesso
- Todos os outros: ❌ Sem acesso

### Cenário 4: Playground Público + Clients Externos

**Objetivo:** Time interno testa livremente, 3 parceiros externos avaliam.

**Configuração:**

- `access_control_type = 'open'`
- Convidar 3 parceiros como `client` via `/admin/users/invite`
- Autorizar cada client em `playground_authorized_users`

**Resultado:**

- Testers internos: ✅ Acesso livre
- Parceiro 1 (client autorizado): ✅ Acesso
- Parceiro 2 (client autorizado): ✅ Acesso
- Parceiro 3 (client autorizado): ✅ Acesso
- Outro client: ❌ Sem acesso

## Interface de Gerenciamento

### Autorizar Client em Playground Público

1. Acesse `/admin/playground-access`
2. Selecione o playground
3. Tipo de acesso: **Open** (público para testers)
4. Clique "Adicionar Usuário Autorizado"
5. Selecione o client
6. Adicione nota opcional: "Consultor externo - Projeto X"
7. Salve

**Resultado:** Playground continua público para testers, mas client específico agora tem acesso.

### Ver Quem Tem Acesso

1. Acesse `/admin/playground-access`
2. Selecione o playground
3. Na seção "Usuários Autorizados":
   - 🟢 Lista todos os clients autorizados
   - 📝 Mostra notas de autorização
   - 👤 Mostra quem autorizou
   - 📅 Data de autorização

## API Endpoints

### GET /playgrounds/:id

Retorna detalhes do playground incluindo `access_control_type`

### PUT /playgrounds/:id/access-type

Altera tipo de acesso do playground

**Body:**

```json
{
  "access_control_type": "open" | "email_restricted" | "explicit_authorization",
  "restricted_emails": ["email1@marisa.care"] // apenas para email_restricted
}
```

### GET /admin/playgrounds/:id/authorized-users

Lista todos os usuários autorizados explicitamente

### POST /admin/playgrounds/:id/authorize-user

Adiciona autorização para usuário específico

**Body:**

```json
{
  "user_id": "uuid",
  "notes": "Consultor externo - Projeto Y"
}
```

### DELETE /admin/playgrounds/:id/authorized-users/:userId

Remove autorização de usuário

## Lógica de Código

### Verificação de Acesso (userHasPlaygroundAccess)

```typescript
// 1. Admins sempre têm acesso
if (userRole === "admin") return true;

// 2. Clients SEMPRE precisam de autorização explícita
if (userRole === "client") {
  return checkExplicitAuthorization(userId, playgroundId);
}

// 3. Testers: depende do tipo de acesso
switch (accessControlType) {
  case "open":
    return true; // Público

  case "email_restricted":
    return restricted_emails.includes(userEmail);

  case "explicit_authorization":
    return checkExplicitAuthorization(userId, playgroundId);
}
```

### Listagem de Playgrounds (getUserAccessiblePlaygrounds)

```typescript
// Admins: todos os playgrounds
if (userRole === 'admin') return allPlaygrounds;

// Clients: apenas autorizados explicitamente
if (userRole === 'client') {
  return playgrounds WHERE id IN (
    SELECT playground_id FROM playground_authorized_users WHERE user_id = userId
  );
}

// Testers: baseado em regras de acesso
for (playground of allPlaygrounds) {
  if (playground.access_control_type === 'open') ✅
  if (playground.access_control_type === 'email_restricted' && email in list) ✅
  if (playground.access_control_type === 'explicit_authorization' && authorized) ✅
}
```

## Migrações Relacionadas

- `006_add_client_role_and_authorizations.sql` - Cria role client e tabela de autorizações
- `007_add_access_control_views.sql` - Views para facilitar queries de acesso

## Troubleshooting

### Client não vê playground público

- ✅ Verificar se client está autorizado em `playground_authorized_users`
- ✅ Verificar se playground está ativo (`is_active = true`)
- ✅ Verificar role do usuário é `client`

### Tester não vê playground público

- ✅ Verificar `access_control_type = 'open'`
- ✅ Verificar se playground está ativo
- ✅ Se `email_restricted`, verificar se email está na lista

### Playground deveria ser público mas ninguém vê

- ✅ Verificar `access_control_type = 'open'`
- ✅ Verificar `is_active = true`
- ✅ Verificar se não mudou para `explicit_authorization` por engano

## Boas Práticas

1. **Use "Open" para playgrounds gerais** - Todo o time pode testar
2. **Adicione clients específicos** - Mesmo em playgrounds públicos
3. **Use "Email Restricted" para departamentos** - Controle por lista de emails
4. **Use "Explicit Authorization" para confidencial** - Controle granular
5. **Sempre adicione notas** - Documente porque autorizou
6. **Revise autorizações periodicamente** - Remova acessos desnecessários
