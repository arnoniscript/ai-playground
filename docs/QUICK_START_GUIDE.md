# 🚀 Guia Rápido de Uso - AI Marisa Playground

## Índice

1. [Iniciando o Sistema](#iniciando-o-sistema)
2. [Fluxo do Admin](#fluxo-do-admin)
3. [Fluxo do Tester](#fluxo-do-tester)
4. [Configuração de Email](#configuração-de-email)

---

## Iniciando o Sistema

### 1. Backend (Terminal 1)

```bash
cd backend
npm run dev
```

✅ Backend rodando em: http://localhost:3001

### 2. Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

✅ Frontend rodando em: http://localhost:3000

### 3. Verificar Status

```bash
# Health check backend
curl http://localhost:3001/health

# Abrir frontend
open http://localhost:3000
```

---

## Fluxo do Admin

### 📝 1. Login

```
URL: http://localhost:3000/login
Email: admin@marisa.care
```

1. Digite email
2. Receba código OTP (email ou console se em dev)
3. Digite OTP
4. ✅ Logado como admin

---

### ➕ 2. Criar Playground

**URL**: `/admin/create-playground`

#### Passo a Passo:

1. **Informações Básicas**

   - Nome: `Teste de Atendimento 01`
   - Tipo: `Teste A/B` ou `Ajuste (Tuning)`
   - Descrição: `Avaliar qualidade do atendimento`
   - Texto de Suporte: `Ouça atentamente e avalie a experiência`

2. **Adicionar Modelos**

   - Clique em `+ Adicionar Modelo`
   - Chave: `model_a`
   - Código Embed: Cole o código da Eleven Labs

   ```html
   <elevenlabs-convai agent-id="seu-agent-id"></elevenlabs-convai>
   <script src="https://elevenlabs.io/convai-widget/index.js"></script>
   ```

   - Para A/B: adicione pelo menos 2 modelos

3. **Adicionar Perguntas**

   - Clique em `+ Adicionar Pergunta`
   - Texto: `Como você avalia a naturalidade da voz?`
   - Tipo: `Múltipla Escolha`
   - Opções:
     - `Muito Natural`
     - `Natural`
     - `Pouco Natural`
     - `Artificial`
   - Marque como obrigatória

4. **Ordenar Perguntas**

   - Use botões ↑ ↓ para reordenar
   - Primeira pergunta aparece primeiro no formulário

5. **Salvar**
   - Clique em `Criar Playground`
   - ✅ Redirecionado para página de edição

---

### ✏️ 3. Editar Playground

**URL**: `/admin/playground/{id}`

#### Ações Disponíveis:

1. **Ativar/Desativar**

   - Botão verde: Ativar
   - Botão vermelho: Desativar
   - ⚠️ Playgrounds inativos não aparecem para testers

2. **Editar Detalhes**

   - Modificar nome, descrição, texto de suporte
   - Clique em `Salvar Alterações`

3. **Copiar Link**

   - Clique em `🔗 Copiar Link do Playground`
   - Compartilhe com testers:
     ```
     http://localhost:3000/playground/{id}
     ```

4. **Ver Métricas**
   - Clique em `📊 Ver Métricas e Resultados`
   - Visualize dashboard completo

---

### 📊 4. Dashboard de Métricas

**URL**: `/admin/playground/{id}/metrics`

#### O que você vê:

1. **Cards de Resumo**

   ```
   Total de Avaliações: 45
   Avaliadores Únicos: 12
   Média de Avaliações/Usuário: 3.8
   ```

2. **Gráfico de Desempenho por Modelo**

   - Barras mostrando total de avaliações
   - Nota média (se aplicável)

3. **Análise de Perguntas**

   - Gráfico de pizza para múltipla escolha
   - Tabela com % de cada opção
   - Exemplo:
     ```
     Muito Natural: 45% (20 respostas)
     Natural: 35% (16 respostas)
     Pouco Natural: 15% (7 respostas)
     Artificial: 5% (2 respostas)
     ```

4. **Respostas Abertas**
   - Tabela com últimas 100 respostas de texto
   - Colunas: Pergunta | Resposta | Modelo | Data

---

## Fluxo do Tester

### 📝 1. Login

```
URL: http://localhost:3000/login
Email: tester@marisa.care
```

1. Digite email
2. Receba código OTP
3. Digite OTP
4. ✅ Logado como tester

---

### 🎯 2. Acessar Playground

**Receba o link do admin**:

```
http://localhost:3000/playground/{id}
```

#### Tela Inicial:

- Nome do playground
- Descrição (se houver)
- Texto de suporte (se houver)
- Botão: `Começar Avaliação`

---

### 🎤 3. Avaliar Modelo (A/B Testing)

#### Step 1 of 2:

1. **Visualizar Modelo A**

   - Widget da Eleven Labs é carregado
   - Header mostra: `Modelo: model_a`

2. **Interagir com o Modelo**

   - Clique no microfone
   - Converse com o agente
   - Ouça atentamente

3. **Responder Perguntas**

   - Perguntas de múltipla escolha: Selecione uma opção
   - Perguntas de texto: Digite sua resposta
   - ⚠️ Campos obrigatórios têm asterisco (\*)

4. **Enviar**
   - Clique em `Enviar Avaliação`
   - ✅ Progresso: Step 1 of 2 completo

#### Step 2 of 2:

1. **Visualizar Modelo B**

   - Novo widget é carregado
   - Header mostra: `Modelo: model_b`

2. **Repetir Avaliação**

   - Mesmas perguntas
   - Mesmo processo

3. **Finalizar**
   - Clique em `Enviar Avaliação`
   - ✅ Redirecionado para página de conclusão
   - Mensagem: `Obrigado por sua avaliação!`

---

### 🎯 4. Avaliar Modelo (Tuning)

#### Avaliação Única:

1. **Visualizar Modelo**

   - Widget da Eleven Labs é carregado
   - Interaja com o agente

2. **Responder Perguntas**

   - Preencha todas as perguntas

3. **Enviar**
   - Clique em `Enviar Avaliação`
   - ✅ Pode aparecer novo modelo se não atingiu limite
   - Ou: Página de conclusão

---

## Configuração de Email

### 📧 Opção 1: Resend (Recomendado)

1. **Criar conta no Resend**

   ```
   https://resend.com
   ```

2. **Obter API Key**

   - Acesse: API Keys
   - Crie nova key
   - Copie o valor

3. **Configurar .env**

   ```bash
   # backend/.env
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
   EMAIL_FROM=onboarding@resend.dev
   ```

4. **Testar**
   ```bash
   # Fazer login no frontend
   # Email será enviado via Resend
   ```

---

### 🧪 Opção 2: Modo Desenvolvimento

1. **Verificar .env**

   ```bash
   # backend/.env
   NODE_ENV=development
   ```

2. **OTP no Console**

   ```bash
   # Ao solicitar OTP, veja no terminal do backend:
   OTP for admin@marisa.care: 123456
   ```

3. **OTP na Resposta**
   ```json
   {
     "message": "OTP sent to email",
     "email": "admin@marisa.care",
     "otp": "123456"
   }
   ```

---

## 🐛 Troubleshooting

### Problema: Email não chega

**Solução 1**: Verificar logs do backend

```bash
# Terminal do backend deve mostrar:
OTP for email@example.com: 123456
```

**Solução 2**: Verificar API Key do Resend

```bash
# Testar API Key
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_xxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"from":"onboarding@resend.dev","to":"test@example.com","subject":"Test","html":"Test"}'
```

---

### Problema: Gráficos não aparecem

**Solução**: Reinstalar recharts

```bash
cd frontend
npm install recharts
npm run dev
```

---

### Problema: Embed não carrega

**Verificar**:

1. Código embed está correto?
2. Script da Eleven Labs está incluído?
3. Console do navegador mostra erros?

**Exemplo correto**:

```html
<elevenlabs-convai agent-id="seu-id"></elevenlabs-convai>
<script src="https://elevenlabs.io/convai-widget/index.js"></script>
```

---

### Problema: Erro 401 (Unauthorized)

**Solução**:

1. Fazer logout: `/logout`
2. Limpar localStorage: Inspecionar → Application → Local Storage → Limpar
3. Fazer login novamente

---

## 📋 Checklist de Teste

### Para Admin:

- [ ] Login com email @marisa.care
- [ ] Criar playground A/B com 2 modelos
- [ ] Criar playground Tuning com 1 modelo
- [ ] Adicionar perguntas de múltipla escolha
- [ ] Adicionar perguntas de texto aberto
- [ ] Ativar/desativar playground
- [ ] Editar nome e descrição
- [ ] Copiar link do playground
- [ ] Ver métricas (vazio inicialmente)

### Para Tester:

- [ ] Login com email diferente do admin
- [ ] Acessar link do playground
- [ ] Interagir com modelo
- [ ] Responder todas as perguntas
- [ ] Enviar avaliação
- [ ] Para A/B: avaliar segundo modelo
- [ ] Ver página de conclusão

### Para Admin (após avaliações):

- [ ] Ver métricas atualizadas
- [ ] Verificar total de avaliações
- [ ] Verificar gráficos de perguntas
- [ ] Verificar respostas abertas

---

## 🎯 Exemplo Completo

### 1. Admin cria playground "Atendimento Médico"

```yaml
Nome: Teste de Atendimento Médico
Tipo: A/B Testing
Descrição: Avaliar agentes de atendimento médico

Modelos:
  - model_a:
      embed_code: <elevenlabs-convai agent-id="agente-a">...
  - model_b:
      embed_code: <elevenlabs-convai agent-id="agente-b">...

Perguntas:
  1. Como você avalia a empatia do atendente?
     Tipo: Múltipla Escolha
     Opções: [Excelente, Boa, Regular, Ruim]

  2. O atendente respondeu suas dúvidas?
     Tipo: Múltipla Escolha
     Opções: [Sim, completamente, Parcialmente, Não]

  3. Comentários adicionais:
     Tipo: Texto Aberto
```

### 2. Tester avalia

**Link recebido**: `http://localhost:3000/playground/abc123`

**Avaliação do Modelo A**:

1. Conversa: "Olá, estou com dor de cabeça"
2. Respostas:
   - Empatia: `Excelente`
   - Respondeu dúvidas: `Sim, completamente`
   - Comentários: `Atendimento muito gentil e esclarecedor`

**Avaliação do Modelo B**:

1. Conversa: "Olá, estou com dor de cabeça"
2. Respostas:
   - Empatia: `Boa`
   - Respondeu dúvidas: `Parcialmente`
   - Comentários: `Poderia ser mais detalhado`

### 3. Admin vê métricas

**Dashboard mostra**:

```
Total de Avaliações: 2
Avaliadores Únicos: 1

Modelo A: 1 avaliação
Modelo B: 1 avaliação

Pergunta: "Como você avalia a empatia?"
  Excelente: 50% (1)
  Boa: 50% (1)
  Regular: 0%
  Ruim: 0%

Respostas Abertas:
  - "Atendimento muito gentil e esclarecedor" (model_a)
  - "Poderia ser mais detalhado" (model_b)
```

---

## 🚀 Próximos Passos

Após testar localmente:

1. **Configurar produção**

   - Deploy backend (Vercel/Railway)
   - Deploy frontend (Vercel)
   - Configurar domínio real no Resend

2. **Convidar usuários**

   - Adicionar emails no banco de dados
   - Compartilhar links de playground
   - Coletar feedbacks

3. **Monitorar**
   - Verificar métricas diariamente
   - Ajustar perguntas conforme necessário
   - Exportar dados para análise

---

**Dúvidas?** Consulte:

- `docs/IMPLEMENTATION_PROGRESS.md` - Detalhes técnicos
- `docs/TODO.md` - Features pendentes
- `docs/API.md` - Documentação de endpoints

**Desenvolvido com ❤️ por GitHub Copilot & Luiz Arnoni**
