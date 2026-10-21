# AgroBot 2.0: contexto do projeto para atualização de documentos

Este texto resume o estado atual do projeto AgroBot 2.0, com foco na substituição do N8N por um
backend próprio em código. Ele serve de base para atualizar documentos acadêmicos e de negócio
(por exemplo, a atividade "Business Model Canvas — Gestão da Inovação") que ainda descrevem a
versão antiga, baseada no N8N.

## Regras para usar este contexto

- O N8N **não é mais usado** em nenhuma parte do projeto. Qualquer menção a ele como tecnologia
  atual deve ser trocada. Ele pode aparecer apenas como histórico ("o protótipo inicial usava N8N").
- Separe sempre o que **já está implementado** do que está **planejado** (seção 6). Não descreva
  como pronto algo que ainda é plano.
- **Não invente resultados de validação.** Nenhuma hipótese foi validada com produtores reais
  ainda (seção 7).
- Mantenha o tom e o formato de cada documento; troque só o necessário.
- Em textos para público não técnico, prefira "backend próprio" ou "servidor próprio" a nomes de
  bibliotecas.

## 1. O projeto

O AgroBot 2.0 é um diário agrícola por voz. O produtor rural fala a atividade ("ontem passei
vinte litros de glifosato no talhão dois"), a IA transcreve e interpreta a fala, e o aplicativo
mostra um rascunho estruturado (tipo de atividade, produto, quantidade, unidade, talhão, data,
custo). O produtor confirma ou corrige, e o registro fica salvo no diário.

- Público: produtores rurais com baixa familiaridade digital.
- Modelo de negócio: B2B2C. Cooperativas, associações e empresas do agronegócio pagam; o
  produtor usa com baixa barreira.
- Diferencial planejado: alertas de período de carência de defensivos, calculados por regra
  determinística (nunca decididos pela IA).
- Contexto acadêmico: projeto ligado à Universidade do Contestado (UnC), com parcerias buscadas
  com Epagri, Sebrae e cooperativas.

## 2. A mudança: do N8N para um backend próprio

**Antes:** o protótipo usava um fluxo no N8N (ferramenta visual de automação). Um webhook recebia
o áudio, o fluxo chamava a transcrição (Whisper) e um modelo de linguagem para interpretar a fala.
Servia para validar a ideia experimentalmente.

**Agora:** todo o sistema é construído em código TypeScript, editado no VS Code e versionado no
Git. O papel do N8N passou para um backend próprio em Node.js + Express, com uma fila de tarefas
em código (pg-boss) que roda sobre o próprio banco PostgreSQL do Supabase.

### Por que mudar

- Tudo fica versionado e revisável no Git, inclusive os prompts da IA.
- Permite testes automatizados e uma avaliação automática da precisão da IA.
- Um serviço a menos para hospedar e pagar.
- Uma única linguagem (TypeScript) no aplicativo e no backend, o que facilita para uma equipe pequena.
- Controle fino sobre segurança: autenticação, dono de cada registro e áudios em armazenamento privado.

### O que o N8N fazia e o que entrou no lugar

| Papel do N8N | Substituto em código |
| --- | --- |
| Receber o áudio (webhook) | Rota `POST /v1/voice-jobs` da API |
| Encadear transcrição, interpretação e validação | Função `processVoiceJob`, executada por um worker |
| Repetir em caso de falha | Fila pg-boss: até 3 novas tentativas, com espera crescente |
| Guardar credenciais | Arquivo `.env` e variáveis de ambiente |
| Ver execuções e erros | Tabela `voice_jobs` (status, erro, tentativas) e logs |
| Editar prompts visualmente | Prompts no próprio código, versionados no Git |

**O que se perdeu:** a tela visual do fluxo. O diagrama da arquitetura passou a ser a referência.

## 3. Tecnologias atuais

| Camada | Tecnologia |
| --- | --- |
| Aplicativo | React Native com Expo (SDK 57) e Expo Router, em TypeScript |
| Backend (API + worker) | Node.js + Express, em TypeScript |
| Fila de processamento | pg-boss, sobre o PostgreSQL |
| Banco, login e arquivos | Supabase: PostgreSQL, Auth (login por código) e Storage (áudios) |
| Transcrição de voz | OpenAI (`gpt-4o-mini-transcribe`) |
| Interpretação da fala | Modelo de linguagem da OpenAI (`gpt-5-mini`) com saída estruturada validada por esquema Zod; o modelo é configurável |
| Testes | Vitest e Supertest (24 testes automatizados) |
| Avaliação da IA | Comando `npm run eval`, que mede o acerto por campo |

## 4. Arquitetura

```
Aplicativo (Expo) ──HTTPS + token──► API (Express) ──► Supabase (Auth, PostgreSQL, Storage)
                                         │
                                         └─ fila pg-boss ─► Worker ─► OpenAI (transcrição e interpretação)
```

- O login por código (e-mail ou SMS) é feito pelo aplicativo direto no Supabase Auth. A API
  valida o token em todas as rotas `/v1`.
- API e worker são o mesmo projeto; no MVP rodam no mesmo processo.

## 5. Fluxo de voz (como funciona hoje)

1. O produtor grava o áudio no aplicativo. Cada gravação recebe um identificador único (`client_id`).
2. O aplicativo envia o áudio para a API, que o salva em armazenamento privado, cria a tarefa e
   responde na hora (o processamento é assíncrono).
3. O worker transcreve o áudio e pede à IA os dados estruturados, informando a data de hoje e os
   talhões cadastrados daquele produtor.
4. O código valida e monta o rascunho: padroniza unidades, liga o talhão falado ao talhão
   cadastrado, resolve datas como "ontem" e lista os campos que faltaram.
5. O aplicativo mostra o rascunho; o produtor confirma ou corrige, e a atividade é salva no diário.
6. Reenviar o mesmo áudio não duplica o registro. Se algo falhar, a tarefa é repetida
   automaticamente; esgotadas as tentativas, fica marcada como falha.

Estados da tarefa: `queued → transcribing → extracting → needs_confirmation → confirmed`, ou `failed`.

## 6. O que está pronto e o que falta

**Implementado**
- Backend: autenticação em todas as rotas, áudio em armazenamento privado, fila com novas tentativas,
  proteção contra duplicidade, cadastro de propriedades e talhões, extração com saída estruturada,
  montagem do rascunho em código, diário de atividades.
- Rotas: `GET /health`, `POST /v1/voice-jobs`, `GET /v1/voice-jobs/:id`,
  `POST /v1/voice-jobs/:id/confirm`, `GET /v1/activities`, `GET/POST /v1/farms`, `GET/POST /v1/fields`.
- Banco: tabelas `voice_jobs`, `activities`, `farms` e `fields`, com segurança por linha (cada
  usuário só acessa os próprios registros).
- Aplicativo: login por código, gravar, enviar, acompanhar o processamento, conferir o rascunho,
  salvar e ver no diário; cadastro de propriedade e talhões.
- Avaliação automática da IA com 8 casos de teste.

**Planejado (ainda não existe)**
- Catálogo de produtos com dias de carência, cálculo da carência e alertas.
- Assistente que responde perguntas sobre o histórico ("posso colher o talhão 2?").
- Fila offline persistente (hoje, sem internet, a gravação se perde ao fechar o aplicativo).
- Edição de atividade, painel da cooperativa, convites e consentimento (LGPD).
- Monitoramento de erros (Sentry) e métricas de uso (PostHog).
- Hospedagem do backend na nuvem (opções avaliadas: Railway, Render ou Fly.io). Hoje roda localmente.

Etapas do plano: 1) base do backend (feita); 2) fluxo de voz ponta a ponta (feita);
3) carência, alertas e assistente; 4) modo offline; 5) piloto com cinco produtores; 6) módulo da cooperativa.

## 7. Situação das hipóteses de validação

| Hipótese | Como será testada | Situação |
| --- | --- | --- |
| 1. Produtores com baixa familiaridade digital registram atividades só por voz | Cinco produtores, sem treinamento prévio | Não testada; depende do piloto (etapa 5) |
| 2. A integração entre voz, backend e IA interpreta termos rurais corretamente | Avaliação automática (`npm run eval`): meta de **85% dos campos essenciais corretos** (tipo, produto, quantidade, unidade, talhão, data) | Ferramenta pronta; os 8 casos atuais são frases escritas pela equipe. Faltam gravações reais de produtores, com sotaques e ruído |
| 3. O sistema identifica corretamente o período de carência | Registrar aplicações e consultar o assistente | Não testada; a regra de carência ainda será implementada (etapa 3) |

## 8. Impacto em custos e recursos

- **Sai:** hospedagem e manutenção do N8N.
- **Entra ou permanece:**
  - Supabase (o plano gratuito atende o MVP; projetos parados por cerca de uma semana são pausados).
  - APIs de IA da OpenAI, pagas por uso (transcrição e interpretação).
  - Hospedagem do backend, quando for publicado.
  - SMS para login por celular (opcional; o login por e-mail é gratuito).
  - Publicação: Google Play cobra uma **taxa única**, e a Apple, uma **taxa anual**.
- Correção a fazer onde aparecer: a taxa do Google Play não é anual.

## 9. Trechos sugeridos para a atividade (Business Model Canvas)

| Trecho | Texto proposto |
| --- | --- |
| Estágio atual | "Protótipo: o fluxo de voz foi validado experimentalmente e está sendo reimplementado em código próprio (backend em TypeScript e aplicativo em React Native), rumo ao MVP." |
| Recursos-chave | "…tecnologias de infraestrutura (backend próprio em Node.js/TypeScript, PostgreSQL/Supabase para banco de dados, autenticação e armazenamento de áudio) e integração de APIs de inteligência artificial para transcrição e interpretação." |
| Atividades-chave | "…construção do banco de dados relacional, manutenção do backend e do processamento assíncrono de áudio, curadoria da base de produtos e períodos de carência, e avaliação contínua da precisão da IA." |
| Estrutura de custos | "Infraestrutura cloud: hospedagem do backend e Supabase. Envio de SMS para login. Publicação: taxa única do Google Play e taxa anual da Apple." |
| Hipótese 2 | "A integração entre reconhecimento de voz, backend e inteligência artificial será capaz de interpretar termos rurais corretamente." Teste: submeter gravações reais ao conjunto de avaliação automatizado. Critério: ao menos 85% dos campos essenciais corretos. |
| Síntese | Trocar "transcrição Whisper via N8N" por "transcrição e modelos de linguagem orquestrados por backend próprio". |

## 10. Glossário

- **Talhão:** subdivisão da propriedade onde se planta uma cultura.
- **Período de carência:** dias mínimos entre a aplicação de um defensivo e a colheita.
- **Rascunho:** dados extraídos da fala, mostrados para o produtor conferir antes de salvar.
- **Worker:** parte do backend que processa os áudios em segundo plano.
- **Fila de tarefas:** lista de áudios aguardando processamento, com novas tentativas em caso de falha.
- **Login por código (OTP):** o produtor recebe um código por e-mail ou SMS, sem precisar de senha.
