# 📧 Guia de Configuração de Email para OTP

## 🔍 Situação Atual

**Status**: OTP é exibido apenas no console do backend (modo desenvolvimento)

```typescript
// backend/src/routes/auth.ts linha ~56
console.log(`OTP for ${email}: ${otp}`);
```

**Por que não recebo email?**

- O sistema ainda não tem integração com serviço de email
- Em desenvolvimento, o OTP aparece no terminal do backend
- Para produção, é necessário configurar um provedor de email

---

## 🚀 Como Adicionar Envio de Email

### Opção 1: **Resend** (Recomendado - Mais Simples)

**Vantagens**: Setup rápido, API simples, 100 emails grátis/dia

1. **Criar conta**: https://resend.com
2. **Obter API Key**
3. **Instalar pacote**:

   ```bash
   cd backend
   npm install resend
   ```

4. **Adicionar ao .env**:

   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   EMAIL_FROM=noreply@marisa.care
   ```

5. **Atualizar auth.ts**:

   ```typescript
   import { Resend } from "resend";

   const resend = new Resend(process.env.RESEND_API_KEY);

   // Substituir linha do console.log por:
   await resend.emails.send({
     from: process.env.EMAIL_FROM || "noreply@marisa.care",
     to: email,
     subject: "Seu código de acesso - AI Marisa Playground",
     html: `
       <h2>Código de Acesso</h2>
       <p>Seu código OTP é:</p>
       <h1 style="font-size: 32px; letter-spacing: 5px;">${otp}</h1>
       <p>Este código expira em 10 minutos.</p>
     `,
   });

   // Manter console.log apenas em development
   if (config.server.nodeEnv === "development") {
     console.log(`OTP for ${email}: ${otp}`);
   }
   ```

---

### Opção 2: **SendGrid**

**Vantagens**: Gratuito até 100 emails/dia, muito confiável

1. **Criar conta**: https://sendgrid.com
2. **Criar API Key**: Settings > API Keys
3. **Instalar**:

   ```bash
   npm install @sendgrid/mail
   ```

4. **Configurar .env**:

   ```env
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   EMAIL_FROM=noreply@marisa.care
   ```

5. **Código**:

   ```typescript
   import sgMail from "@sendgrid/mail";

   sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

   await sgMail.send({
     to: email,
     from: process.env.EMAIL_FROM!,
     subject: "Código OTP - AI Marisa",
     text: `Seu código OTP: ${otp}`,
     html: `<h1>${otp}</h1>`,
   });
   ```

---

### Opção 3: **Nodemailer** (SMTP Genérico)

**Vantagens**: Funciona com qualquer servidor SMTP (Gmail, Outlook, etc.)

1. **Instalar**:

   ```bash
   npm install nodemailer
   npm install --save-dev @types/nodemailer
   ```

2. **Configurar .env** (exemplo Gmail):

   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=seu-email@gmail.com
   SMTP_PASS=sua-senha-app  # Senha de app, não senha normal
   EMAIL_FROM=noreply@marisa.care
   ```

3. **Código**:

   ```typescript
   import nodemailer from "nodemailer";

   const transporter = nodemailer.createTransport({
     host: process.env.SMTP_HOST,
     port: parseInt(process.env.SMTP_PORT!),
     secure: false,
     auth: {
       user: process.env.SMTP_USER,
       pass: process.env.SMTP_PASS,
     },
   });

   await transporter.sendMail({
     from: process.env.EMAIL_FROM,
     to: email,
     subject: "Seu código OTP",
     html: `<h1>${otp}</h1>`,
   });
   ```

---

## 🎯 Implementação Rápida (5 minutos)

### Usando Resend (Recomendado):

```bash
# 1. Instalar
cd backend
npm install resend

# 2. Adicionar ao .env
echo "RESEND_API_KEY=re_sua_key_aqui" >> .env
echo "EMAIL_FROM=noreply@marisa.care" >> .env
```

**Editar `backend/src/routes/auth.ts`:**

```typescript
// No topo do arquivo
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Substituir linha ~56 (console.log do OTP) por:
try {
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "noreply@marisa.care",
    to: email,
    subject: "Código de Acesso - AI Marisa",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Código de Acesso</h2>
        <p>Use o código abaixo para acessar o AI Marisa Playground:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
        </div>
        <p style="color: #666;">Este código expira em 10 minutos.</p>
      </div>
    `,
  });
  console.log(`✓ OTP sent to ${email}`);
} catch (error) {
  console.error("Email error:", error);
  // Fallback: mostrar no console
  console.log(`OTP for ${email}: ${otp}`);
}
```

---

## 📝 Notas Importantes

### Verificação de Domínio

Para emails em produção de domínios personalizados (como `@marisa.care`), você precisa:

1. **DNS Records**: Adicionar registros SPF, DKIM e DMARC no seu domínio
2. **Verificação**: Verificar domínio no painel do Resend/SendGrid
3. **Aguardar**: Propagação DNS (até 48h, geralmente minutos)

### Ambiente de Desenvolvimento

Durante desenvolvimento, você pode:

- ✅ Usar o OTP do console (atual)
- ✅ Usar email pessoal temporário
- ✅ Usar serviço de teste como [Mailtrap](https://mailtrap.io)

### Ambiente de Produção

Recomendações:

- ✅ Usar Resend ou SendGrid (confiáveis)
- ✅ Configurar domínio personalizado
- ✅ Monitorar taxa de entrega
- ✅ Implementar retry logic para falhas

---

## 🔧 Solução de Problemas

### Email não chega?

1. **Verifique spam/lixeira**
2. **Confira API Key**: Válida e com permissões corretas
3. **Domínio verificado**: Se usar email personalizado
4. **Logs**: Checar erros no console do backend

### Taxa de envio limitada?

- Resend: 100 emails/dia (grátis)
- SendGrid: 100 emails/dia (grátis)
- Upgrade para plano pago se necessário

---

## ✅ Checklist de Implementação

- [ ] Escolher provedor (Resend recomendado)
- [ ] Criar conta e obter API key
- [ ] Instalar pacote npm
- [ ] Adicionar credenciais ao .env
- [ ] Atualizar código em auth.ts
- [ ] Testar envio de email
- [ ] Configurar template HTML (opcional)
- [ ] Verificar domínio (produção)
- [ ] Monitorar logs de envio

---

**Por enquanto**: Continue usando o OTP do console para desenvolvimento. É perfeitamente normal! 🎉
