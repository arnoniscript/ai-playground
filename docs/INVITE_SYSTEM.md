# 📧 Sistema de Convite de Usuários

## Visão Geral

Sistema completo de convite de usuários com email HTML bonito e fluxo de cadastro integrado.

## Fluxo de Convite

### 1. Admin Convida Usuário

- Admin acessa `/admin/users`
- Clica em "Convidar Usuário"
- Preenche:
  - Email (obrigatório)
  - Nome completo (opcional)
  - Role (admin, tester, client)
- Sistema cria usuário com status `pending_invite`

### 2. Email Enviado Automaticamente

O usuário convidado recebe um email com:

- **Assunto**: 🎉 Você foi convidado para o Playground de IA da Marisa Care
- **Design**: Email HTML responsivo com gradient roxo/azul
- **Conteúdo**:
  - Saudação personalizada (se nome foi informado)
  - Quem convidou
  - Descrição da plataforma
  - Instruções de próximos passos
  - Botão "✨ Completar Cadastro"
  - Link alternativo em texto

### 3. Usuário Clica no Link

- Link: `${FRONTEND_URL}/login?email=${email_convidado}`
- Abre página de login com:
  - Email pré-preenchido
  - Mensagem de boas-vindas
  - Destaque visual (badge azul)

### 4. Completar Cadastro

- Usuário confirma email
- Clica em "Enviar Código"
- Recebe OTP por email
- Digita código
- Status muda de `pending_invite` para `active`
- Redirecionado para `/dashboard`

## Código Implementado

### 1. Serviço de Email

**Arquivo**: `backend/src/utils/email.ts`

- Função `sendInviteEmail()`
- Template HTML responsivo
- Gradient roxo/azul da Marisa Care
- Emojis e formatação moderna

### 2. Configuração

**Arquivo**: `backend/src/config.ts`

```typescript
email: {
  resendApiKey: process.env.RESEND_API_KEY,
  from: process.env.EMAIL_FROM,
},
frontend: {
  url: process.env.FRONTEND_URL,
}
```

### 3. Rota Admin Atualizada

**Arquivo**: `backend/src/routes/admin.ts`

- POST `/admin/users/invite`
- Cria usuário
- Envia email automaticamente
- Retorna status do envio

### 4. LoginForm Atualizado

**Arquivo**: `frontend/components/login-form.tsx`

- Aceita parâmetro `?email=` na URL
- Pré-preenche campo de email
- Mostra badge de boas-vindas
- Identifica usuários convidados

## Variáveis de Ambiente

### Backend (.env)

```env
RESEND_API_KEY=re_gew5xebh_4j4G35JRvAbGCk81dJp3TAiL
EMAIL_FROM=noreply@marisa.care
FRONTEND_URL=http://localhost:3000
```

### Produção (Railway)

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@marisa.care
FRONTEND_URL=https://seu-dominio-vercel.app
```

## Template do Email

### Características

- ✅ HTML responsivo (mobile-friendly)
- ✅ Design moderno com gradient
- ✅ Botão CTA destacado
- ✅ Link alternativo para copiar/colar
- ✅ Footer com informações
- ✅ Emojis para engajamento
- ✅ Personalização com nome do convidado
- ✅ Identifica quem convidou

### Cores

- **Primary Gradient**: #667eea → #764ba2 (roxo/azul)
- **Background**: #f5f5f5 (cinza claro)
- **Content**: #ffffff (branco)
- **Text**: #333333 (escuro)
- **Accent**: #667eea (azul)

## API Response

### Sucesso

```json
{
  "message": "User invited successfully",
  "data": {
    "id": "uuid",
    "email": "novo@example.com",
    "full_name": "Nome",
    "role": "tester",
    "status": "pending_invite",
    "invited_at": "2024-01-08T12:00:00Z",
    "invited_by": "admin-uuid"
  },
  "email_sent": true,
  "note": "User will receive an invitation email to complete signup"
}
```

### Email Falhou (usuário criado)

```json
{
  "message": "User invited successfully",
  "data": {
    /* dados do usuário */
  },
  "email_sent": false,
  "note": "User created but email could not be sent. User can still complete signup via login."
}
```

## Tratamento de Erros

### Email não enviado

- Sistema continua funcionando
- Usuário é criado normalmente
- Admin é notificado via response
- Usuário pode fazer login manual

### Email já existe

```json
{
  "error": "User already exists",
  "user_status": "active"
}
```

## Logs

### Backend Console

```
Invite email sent successfully: { id: 'xxx' }
```

### Erro de email

```
Failed to send invitation email, but user was created: { error }
```

## Testes

### 1. Testar Localmente

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

1. Login como admin
2. Acesse `/admin/users`
3. Clique "Convidar Usuário"
4. Preencha email (use um email real que você controle)
5. Verifique inbox do email
6. Clique no botão do email
7. Complete o cadastro

### 2. Testar Email Visual

- Resend Dashboard: https://resend.com/emails
- Veja preview do email enviado
- Verifique se foi entregue

### 3. Testar Fluxo Completo

- [ ] Email recebido
- [ ] Link funciona
- [ ] Email pré-preenchido
- [ ] Badge de boas-vindas aparece
- [ ] OTP enviado
- [ ] Login completo
- [ ] Status muda para `active`
- [ ] Redirecionado ao dashboard

## Melhorias Futuras

- [ ] Email de boas-vindas após completar cadastro
- [ ] Email de redefinição de senha
- [ ] Email de bloqueio de conta
- [ ] Templates customizáveis por tipo de convite
- [ ] Retry automático se email falhar
- [ ] Tracking de emails abertos
- [ ] Expiração de convites (7 dias)
- [ ] Reenvio de convite

## Troubleshooting

### Email não chega

1. Verificar RESEND_API_KEY está correto
2. Verificar EMAIL_FROM é válido no Resend
3. Verificar domínio verificado no Resend
4. Checar spam/lixeira
5. Ver logs no Resend Dashboard

### Link não funciona

1. Verificar FRONTEND_URL está correto
2. Verificar email está sendo codificado (encodeURIComponent)
3. Testar copiar/colar link direto

### Badge não aparece

1. Verificar parâmetro `?email=` na URL
2. Verificar useSearchParams() funcionando
3. Limpar cache do navegador
