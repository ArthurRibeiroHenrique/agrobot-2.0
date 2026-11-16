# AgroBot 2.0: documentação completa do projeto

Este documento reúne, em um só lugar, o que é o AgroBot 2.0, como ele funciona, como o código está
organizado, o que já está pronto e o que ainda falta. Os detalhes de cada assunto continuam nos
documentos numerados da pasta `docs`, indicados ao longo do texto.

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Modelo de negócio](#2-modelo-de-negócio)
3. [Tecnologias](#3-tecnologias)
4. [Arquitetura](#4-arquitetura)
5. [Estrutura de pastas](#5-estrutura-de-pastas)
6. [Fluxo de voz](#6-fluxo-de-voz)
7. [Assistente de perguntas](#7-assistente-de-perguntas)
8. [Backend](#8-backend)
9. [API](#9-api)
10. [Banco de dados](#10-banco-de-dados)
11. [Aplicativo](#11-aplicativo)
12. [Segurança e privacidade](#12-segurança-e-privacidade)
13. [Testes e avaliação da IA](#13-testes-e-avaliação-da-ia)
14. [Como rodar localmente](#14-como-rodar-localmente)
15. [Publicação](#15-publicação)
16. [O que está pronto e o que falta](#16-o-que-está-pronto-e-o-que-falta)
17. [Hipóteses de validação](#17-hipóteses-de-validação)
18. [Custos, riscos e métricas](#18-custos-riscos-e-métricas)
19. [Histórico: do N8N ao backend próprio](#19-histórico-do-n8n-ao-backend-próprio)
20. [Glossário](#20-glossário)
21. [Índice dos documentos](#21-índice-dos-documentos)

---

## 1. Visão geral

O AgroBot 2.0 é um **diário agrícola por voz**. O produtor rural fala o que fez, por exemplo:

> "Ontem passei vinte litros de glifosato no talhão dois."

A IA transcreve o áudio e interpreta a fala. O aplicativo mostra um **rascunho** com os dados
organizados (tipo de atividade, produto, quantidade, unidade, talhão, data e custo). O produtor
confere, corrige se precisar e confirma. O registro fica salvo no diário.

Uma mesma fala pode gerar **vários registros**, por exemplo um para cada talhão citado. Ela também
pode ser uma **pergunta** ("quando posso colher o talhão 2?"), que o assistente responde com base no
histórico do produtor.

- **Público:** produtores rurais com pouca familiaridade com aplicativos.
- **Objetivo:** tirar as anotações da lavoura do papel e da memória, sem exigir formulários.
- **Contexto acadêmico:** projeto ligado à Universidade do Contestado (UnC), com parcerias buscadas
  com Epagri, Sebrae, cooperativas e universidades.

## 2. Modelo de negócio

O modelo é **B2B2C**: cooperativas, associações e empresas do agronegócio pagam pela plataforma, e o
produtor usa com baixa barreira de entrada. A organização pagadora recebe painéis, relatórios e mais
visibilidade da produção dos seus associados.

| Item | Resumo |
| --- | --- |
| Clientes pagantes | Cooperativas, associações, empresas do agronegócio |
| Usuários | Produtores rurais |
| Fontes de receita | Assinatura, implantação, personalização, white label e relatórios |
| Diferencial planejado | Alertas de período de carência de defensivos, por regra fixa no código (nunca decididos pela IA) |
| Preço sugerido | Piloto de R$ 997 a R$ 2.500/mês; cooperativa pequena ou média de R$ 3.500 a R$ 7.500/mês; ou R$ 15 a R$ 35 por produtor ativo/mês |

Detalhes em [01-analise-financeira.md](01-analise-financeira.md),
[06-business-model-canvas.md](06-business-model-canvas.md) e
[07-ecossistema-de-inovacao.md](07-ecossistema-de-inovacao.md).

## 3. Tecnologias

Todo o sistema é escrito em **TypeScript**, no aplicativo e no backend.

| Camada | Tecnologia |
| --- | --- |
| Aplicativo | React Native com Expo (SDK 58) e Expo Router |
| Estado e dados no app | TanStack Query (dados do servidor) e Zustand (estado local) |
| Gravação de áudio | `expo-audio` |
| Backend (API e worker) | Node.js 22+ com Express |
| Validação de dados | Zod (entrada da API, variáveis de ambiente e saída da IA) |
| Fila de processamento | pg-boss, sobre o próprio PostgreSQL |
| Banco, login e arquivos | Supabase: PostgreSQL, Auth (login por código) e Storage (áudios) |
| Transcrição | Azure OpenAI `gpt-4o-mini-transcribe` (a OpenAI direta continua como alternativa) |
| Interpretação e assistente | Azure OpenAI `gpt-5-mini` com saída estruturada; o modelo é configurável |
| Testes | Vitest e Supertest |
| Publicação do backend | Docker, GitHub Actions, GitHub Container Registry e Azure Container Apps |
| Geração do APK | EAS Build (Expo) |

## 4. Arquitetura

```
┌────────────────────┐   HTTPS + token    ┌───────────────────────────┐
│  Aplicativo (Expo) │ ─────────────────► │  API (Express)  /v1/...   │
└─────────┬──────────┘                    └──────┬─────────────┬──────┘
          │ login por código                      │             │ enfileira
          ▼                                       ▼             ▼
┌────────────────────┐                 ┌──────────────────┐  ┌─────────────────┐
│   Supabase Auth    │                 │ Supabase         │  │ Fila pg-boss    │
└────────────────────┘                 │ PostgreSQL       │◄─┤ (no PostgreSQL) │
                                       │ Storage (áudios) │  └────────┬────────┘
                                       └──────────────────┘           │
                                                ▲                      ▼
                                                │             ┌─────────────────┐
                                                └──────────── │ Worker          │ ──► Azure OpenAI
                                                              │ (transcrição e  │     (transcrição,
                                                              │  interpretação) │      interpretação,
                                                              └─────────────────┘      assistente)
```

- O aplicativo faz o login direto no **Supabase Auth**. A API confere o token em todas as rotas `/v1`.
- A API **não processa o áudio na hora**: ela salva o arquivo, cria a tarefa e responde. O worker faz
  o trabalho pesado em segundo plano.
- API e worker são o mesmo projeto. Com `RUN_WORKER=true` (padrão), rodam no mesmo processo; com
  `false`, o worker roda à parte (`npm run dev:worker` ou `npm run start:worker`).

Arquitetura completa e decisões em
[10-proposta-arquitetura-sem-n8n.md](10-proposta-arquitetura-sem-n8n.md) e
[05-arquitetura-react-native.md](05-arquitetura-react-native.md).

## 5. Estrutura de pastas

```
AgroBot2.0/
├── api/openapi.yaml            Especificação da API
├── backend/
│   ├── Dockerfile              Imagem usada na publicação (API + worker)
│   ├── .env.example            Modelo das variáveis de ambiente
│   ├── src/
│   │   ├── server.ts           Inicia a API (e o worker, se RUN_WORKER=true)
│   │   ├── worker.ts           Inicia só o worker
│   │   ├── app.ts              Monta o Express: segurança, rotas e erros
│   │   ├── config/env.ts       Lê e valida as variáveis de ambiente
│   │   ├── jobs/queue.ts       Fila pg-boss: criação, envio e consumo
│   │   ├── lib/                Clientes da IA (Azure OpenAI ou OpenAI) e do Supabase
│   │   ├── middlewares/        Autenticação e tratamento de erros
│   │   ├── routes/             Rotas HTTP
│   │   ├── schemas/            Esquemas Zod (atividade, assistente, propriedade)
│   │   ├── services/           Regras de negócio (voz, rascunho, IA, assistente…)
│   │   └── utils/              Utilitários (erros HTTP, formatos de áudio)
│   ├── supabase/migrations/    Migrações SQL do banco, em ordem de data
│   ├── test/                   Testes automatizados
│   └── eval/                   Avaliação da precisão da IA
├── mobile/
│   ├── app.json, eas.json      Configuração do Expo e do build do APK
│   └── src/
│       ├── app/                Telas (Expo Router: cada arquivo é uma rota)
│       ├── components/         Componentes visuais
│       ├── hooks/              Lógica das telas (gravação, voz, diário…)
│       ├── services/           API, Supabase, áudio e métricas
│       ├── store/              Estado local (login, fila offline)
│       ├── lib/                Constantes, formatação e validação
│       └── types/              Tipos compartilhados
├── docs/                       Documentos de negócio, técnicos e guias
└── scripts/                    Atalhos .bat para instalar e iniciar no Windows
```

## 6. Fluxo de voz

### Passo a passo

1. **Gravação.** O produtor grava no aplicativo. Cada gravação recebe um identificador único
   (`client_id`).
2. **Envio.** O app envia o áudio para `POST /v1/voice-jobs`. A API confere o formato (MP3, M4A,
   WAV, OGG, OPUS, WEBM ou FLAC, até 25 MB), salva o arquivo no bucket privado, cria a tarefa e
   responde com `202` na hora.
3. **Sem duplicidade.** Se o mesmo `client_id` chegar de novo (reenvio), a API devolve a tarefa que
   já existe, sem criar outra.
4. **Transcrição.** O worker transcreve o áudio. Os nomes dos talhões cadastrados vão junto, para
   ajudar a reconhecer palavras como "baixada" ou "talhão do fundo".
5. **Interpretação.** A IA recebe a transcrição, a data de hoje e os talhões do produtor, e devolve
   dados estruturados: a **intenção** (registrar, perguntar, os dois ou incerto) e a lista de
   atividades, **uma por talhão**.
6. **Rascunho em código.** Regras fixas, sem IA, ajustam o resultado:
   - padronizam unidades ("litros" → `L`, "sacas" → `sc`, "quilos" → `kg`);
   - ligam o talhão falado ao cadastrado ("talhão dois" → "Talhão 2");
   - descartam produtos vagos ("um produto", "aquele negócio");
   - resolvem a data ("ontem", "anteontem") pelo fuso do aparelho;
   - listam os campos que faltaram para cada tipo de atividade.
7. **Pergunta junto.** Se a fala tinha uma pergunta, o assistente já responde (seção 7).
8. **Conferência.** O app mostra o rascunho, marcando com "confira" o que não ficou claro. O produtor
   corrige e confirma em `POST /v1/voice-jobs/:id/confirm`, e as atividades vão para o diário.
9. **Falhas.** Se algo der errado, a fila tenta de novo até 3 vezes, com espera crescente. Esgotadas
   as tentativas, a tarefa fica como `failed`, com a mensagem de erro guardada.

### Estados da tarefa

```
queued → transcribing → extracting → needs_confirmation → confirmed
                                   ↘ answered   (era só uma pergunta)
                    qualquer etapa → failed     (esgotou as tentativas)
```

### Campos obrigatórios por tipo de atividade

| Tipo | Campos que precisam estar preenchidos |
| --- | --- |
| `plantio` | produto, talhão |
| `aplicacao` (defensivos) | produto, quantidade, unidade, talhão |
| `adubacao` | produto, quantidade, unidade, talhão |
| `irrigacao` | talhão |
| `colheita` | quantidade, unidade, talhão |
| `manejo` | talhão |
| `custo` | valor |
| `outro` | nenhum |

### Vários talhões na mesma fala

- "Passei glifosato no talhão 1 e no talhão 2" vira **dois registros**.
- "10 litros no talhão 1 e 15 no talhão 2" usa o valor de cada um.
- "40 litros nos talhões 1 e 2" **não divide** o total: a quantidade fica em branco e o produtor
  informa na confirmação.
- O limite é de 20 registros por gravação.

## 7. Assistente de perguntas

O produtor pode perguntar por texto (aba **Perguntar**) ou por voz (na mesma gravação do diário).

- O assistente recebe as **30 atividades mais recentes**, os talhões e a cidade da propriedade.
- Responde em português simples, em até 5 frases curtas, e não inventa registros.
- **Regras de segurança:** nunca informa dose, mistura de produtos ou período de carência, e nunca dá
  diagnóstico definitivo de praga ou doença. Nesses casos manda **procurar um técnico agrícola**.
- O encaminhamento ao técnico é **forçado pelo código**, mesmo que a IA não peça, quando o assunto é
  diagnóstico, dose ou mistura, ou carência e segurança. Também é forçado quando a confiança da
  resposta fica abaixo de 0,6.
- Quando a IA não sabe se a fala era um registro ou uma pergunta (`incerto`), o app pergunta ao
  produtor o que ele quer fazer.
- As conversas ficam na tabela `assistant_messages`.

## 8. Backend

### Comandos (pasta `backend`)

| Comando | O que faz |
| --- | --- |
| `npm run dev` | API (e worker) com recarga automática |
| `npm run dev:worker` | Só o worker, com recarga automática |
| `npm run build` | Compila para `dist/` |
| `npm start` / `npm run start:worker` | Roda a versão compilada |
| `npm run typecheck` | Confere os tipos |
| `npm test` | Testes automatizados |
| `npm run eval` | Avaliação da interpretação da fala |
| `npm run eval:assistant` | Avaliação do encaminhamento ao técnico |

### Variáveis de ambiente (`backend/.env`)

| Variável | Para que serve | Padrão |
| --- | --- | --- |
| `PORT` | Porta da API | `3333` |
| `AI_PROVIDER` | Onde a IA roda: `azure` (Azure OpenAI) ou `openai` (OpenAI direta) | `openai` |
| `AZURE_OPENAI_ENDPOINT` | Endereço do recurso Azure OpenAI da interpretação | obrigatória com `azure` |
| `AZURE_OPENAI_API_KEY` | Chave desse recurso | obrigatória com `azure` |
| `AZURE_OPENAI_API_VERSION` | Versão da API do Azure OpenAI | `2025-04-01-preview` |
| `AZURE_OPENAI_LLM_DEPLOYMENT` | Deployment de interpretação e do assistente | `gpt-5-mini` |
| `AZURE_OPENAI_TRANSCRIPTION_DEPLOYMENT` | Deployment de transcrição | `gpt-4o-mini-transcribe` |
| `AZURE_OPENAI_TRANSCRIPTION_ENDPOINT` e `AZURE_OPENAI_TRANSCRIPTION_API_KEY` | Recurso da transcrição, quando fica em outra região; em branco, usa o de cima | vazio |
| `OPENAI_API_KEY` | Chave da OpenAI | obrigatória com `openai` |
| `OPENAI_TRANSCRIPTION_MODEL` | Modelo de transcrição na OpenAI | `gpt-4o-mini-transcribe` |
| `OPENAI_LLM_MODEL` | Modelo de interpretação na OpenAI | `gpt-5-mini` |
| `SUPABASE_URL` | Endereço do projeto Supabase | obrigatória |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (só no backend) | obrigatória |
| `SUPABASE_AUDIO_BUCKET` | Bucket dos áudios | `voice-audio` |
| `DATABASE_URL` | Conexão do PostgreSQL para a fila (Session pooler, porta 5432) | obrigatória |
| `RUN_WORKER` | `true`: API e worker juntos; `false`: worker à parte | `true` |
| `ALLOWED_ORIGINS` | Origens permitidas no CORS, separadas por vírgula | `http://localhost:3000` |
| `AI_RATE_LIMIT_PER_HOUR` | Máximo de chamadas de IA (áudios e perguntas) por usuário por hora; acima disso, erro 429 | `60` |
| `KEEP_AUDIO_AFTER_PROCESSING` | `false`: apaga o áudio depois de processado; `true`: guarda (ex.: para casos reais do eval) | `false` |

A API não inicia se uma variável obrigatória faltar: o erro diz qual é.

### Principais serviços

| Arquivo | Responsabilidade |
| --- | --- |
| `voice-job.service.ts` | Criar, buscar, atualizar e confirmar tarefas de voz; listar o diário |
| `voice-job-processor.ts` | Etapas do worker: transcrever, interpretar, montar rascunhos, responder |
| `transcription.service.ts` | Baixar o áudio do Storage e transcrever |
| `extraction.service.ts` | Prompt e chamada da IA com saída estruturada |
| `draft.service.ts` | Regras fixas do rascunho: unidades, talhões, datas, campos faltantes |
| `assistant.service.ts` | Prompt do assistente e regras de segurança |
| `farm.service.ts` | Propriedades e talhões |
| `storage.service.ts` | Enviar e apagar áudios no bucket privado |

## 9. API

Base: `http://localhost:3333` (local) ou o endereço publicado. Todas as rotas `/v1` exigem o header
`Authorization: Bearer <token do Supabase>`.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | Verifica se o serviço está no ar (sem login) |
| POST | `/v1/voice-jobs` | Envia um áudio (`multipart/form-data`, campo `audio`; opcionais `client_id`, `farm_id`, `field_id`, `timezone`) |
| GET | `/v1/voice-jobs/:id` | Status, transcrição, rascunhos e resposta da tarefa |
| POST | `/v1/voice-jobs/:id/confirm` | Confirma os registros (`{ "activities": [ … ] }`) |
| POST | `/v1/voice-jobs/:id/ask` | Trata a gravação como pergunta (quando a intenção era incerta) |
| GET | `/v1/activities` | Diário do produtor (inclui o de quem compartilhou com ele) |
| GET / POST | `/v1/shares` | Lista os compartilhamentos ou compartilha o diário (`{ "email": "…" }`) |
| DELETE | `/v1/shares/:memberId` | Para de compartilhar o diário com essa pessoa |
| DELETE | `/v1/shares/received/:ownerId` | Deixa de ver o diário compartilhado por essa pessoa |
| GET / PATCH / DELETE | `/v1/activities/:id` | Detalhes, correção ou exclusão de um registro do diário |
| GET / POST | `/v1/farms` | Lista ou cadastra propriedades |
| GET / POST | `/v1/fields` | Lista (filtro opcional `farm_id`) ou cadastra talhões |
| GET / POST | `/v1/assistant/messages` | Histórico de perguntas ou nova pergunta (`{ "question": "…" }`) |

Especificação em [api/openapi.yaml](../api/openapi.yaml) e explicação em
[04-documentacao-da-api.md](04-documentacao-da-api.md).

## 10. Banco de dados

O banco é o PostgreSQL do Supabase. As migrações ficam em `backend/supabase/migrations` e devem ser
executadas **em ordem**:

| Migração | O que cria ou muda |
| --- | --- |
| `20261005…_schema_inicial` | Tabelas `voice_jobs` e `activities` |
| `20261007…_dono_storage_fila` | Dono de cada registro (`user_id`), `client_id` para evitar duplicidade, tentativas, bucket privado `voice-audio` e segurança por linha |
| `20261008…_propriedades_talhoes_datas` | Tabelas `farms` e `fields`, ligação da atividade ao talhão |
| `20261024…_assistente_intencao` | Tabela `assistant_messages`, intenção e resposta na tarefa de voz |
| `20261027…_varios_talhoes` | Vários rascunhos por gravação (`drafts`) e posição de cada registro (`draft_index`) |
| `20261116…_compartilhamento` | Tabela `diary_shares` (diário compartilhado) e RLS de leitura para quem recebeu o acesso |
| `20261116…_compartilhar_por_email` | Funções `user_id_by_email` e `user_emails`, só para o backend |

| Tabela | Conteúdo |
| --- | --- |
| `voice_jobs` | Cada gravação: status, caminho do áudio, transcrição, intenção, rascunhos, resposta, erro, tentativas |
| `activities` | Registros confirmados do diário: tipo, produto, quantidade, unidade, talhão, data, custo |
| `farms` | Propriedades: nome, cidade, estado |
| `fields` | Talhões: propriedade, nome, cultura, área em hectares |
| `assistant_messages` | Perguntas e respostas, com indicação de encaminhamento ao técnico |
| `diary_shares` | Compartilhamento: `member_id` vê e edita os registros, propriedades e talhões de `owner_id` |

Todas as tabelas têm **segurança por linha** (RLS): cada usuário só lê os próprios registros e os de
quem compartilhou o diário com ele. A fila
pg-boss cria as próprias tabelas, no schema `pgboss`, quando inicia.

### Diário compartilhado

Uma linha em `diary_shares` dá a `member_id` acesso aos dados de `owner_id`: registros do diário,
propriedades e talhões (inclusive para a IA reconhecer os talhões pelo nome). Compartilhar é de mão
única: para duas pessoas verem tudo uma da outra, as duas compartilham.

No app: **Perfil > Compartilhar meu diário**. Basta o e-mail da outra pessoa, que precisa já ter entrado
no AgroBot uma vez. A mesma tela lista quem vê o meu diário (botão **Parar**) e os diários que eu vejo
(botão **Sair**). O backend acha a conta pelo e-mail com as funções `user_id_by_email` e `user_emails`,
que só a service role pode chamar.

Quem edita o registro de outra pessoa não vira dono dele: `user_id` continua sendo quem gravou.

## 11. Aplicativo

### Telas

| Rota | Tela |
| --- | --- |
| `(auth)/login` | Informar celular ou e-mail |
| `(auth)/otp` | Digitar o código recebido |
| `(tabs)/index` — **Início** | "O que você fez hoje?": botão de gravar e último registro |
| `(tabs)/diary` — **Diário** | Lista das atividades confirmadas |
| `(tabs)/assistant` — **Perguntar** | Perguntas ao assistente, por texto |
| `(tabs)/alerts` — **Alertas** | Reservada para os alertas de carência (em construção) |
| `(tabs)/profile` — **Perfil** | Dados do usuário e saída |
| `activity/new-voice` | Gravar e enviar o áudio, acompanhar o processamento |
| `activity/confirm-draft` | Conferir, corrigir e confirmar os rascunhos; escolher entre anotar ou perguntar |
| `farm/setup` | Cadastro da propriedade |
| `farm/fields` | Cadastro de talhões |
| `activity/edit`, `coop/dashboard`, `settings` | Ainda vazias (planejadas) |

### Configuração (`mobile/.env`)

| Variável | Valor |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Endereço da API com `/v1`. No celular, use o IP do computador na rede Wi-Fi (não `localhost`) ou o endereço publicado |
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase |

Princípios da interface: botões grandes, textos curtos, linguagem do campo e o mínimo de digitação.
Detalhes em [03-documentacao-do-app.md](03-documentacao-do-app.md).

## 12. Segurança e privacidade

- **Login sem senha:** código por e-mail ou SMS, pelo Supabase Auth.
- **Token em todas as rotas `/v1`:** a API identifica o usuário pelo token, nunca pelo corpo da
  requisição.
- **Segurança por linha** no banco: cada produtor só acessa os próprios dados.
- **Áudios em bucket privado,** sem acesso direto pelo app; só o backend lê e grava.
- **Chave de serviço do Supabase** só no backend; o app usa apenas a chave pública.
- **Cabeçalhos de segurança** (Helmet) e **CORS** restrito às origens configuradas.
- **Entradas validadas** com Zod; IDs fora do formato UUID respondem 404.
- **IA com limites:** sem dose, mistura, carência ou diagnóstico; encaminhamento ao técnico forçado
  pelo código nos assuntos sensíveis.
- **LGPD:** gravações de produtores são dados pessoais. Consentimento e convites estão no plano.

## 13. Testes e avaliação da IA

### Testes automatizados

`npm test` na pasta `backend` roda 65 testes (Vitest + Supertest), sem chamar a IA nem o Supabase
de verdade:

| Arquivo | O que cobre |
| --- | --- |
| `app.test.ts` | Rotas, autenticação, validação de entrada, duplicidade |
| `draft.test.ts` | Unidades, talhões, datas, produtos vagos, campos faltantes, vários talhões |
| `voice-job-processor.test.ts` | Etapas do worker, intenção, novas tentativas e falha final |
| `assistant.test.ts` | Regras de segurança do assistente |
| `ai-rate-limit.test.ts` | Limite de chamadas de IA por usuário |

### Avaliação da IA

Chama a IA de verdade (Azure OpenAI ou OpenAI, conforme o `AI_PROVIDER`), por isso tem custo. Rode sempre que mudar prompt, modelo ou regras do
rascunho.

| Comando | Casos | Meta |
| --- | --- | --- |
| `npm run eval` | 23 falas em `eval/cases.json` | 85% dos campos essenciais corretos (intenção, número de registros, tipo, produto, quantidade, unidade, talhão, data) |
| `npm run eval:assistant` | 11 perguntas em `eval/assistant-cases.json` | 85% de acerto e **nenhum** encaminhamento faltando em assunto sensível |

Os casos atuais são **frases escritas pela equipe**. Para validar de fato, faltam gravações reais de
produtores, com sotaques, ruído e termos regionais. Detalhes em
[backend/eval/README.md](../backend/eval/README.md).

## 14. Como rodar localmente

Resumo (guia completo, com solução de problemas, em
[11-como-rodar-localmente.md](11-como-rodar-localmente.md)):

**Banco**

1. Criar um projeto no Supabase.
2. No SQL Editor, executar em ordem os arquivos de `backend/supabase/migrations`.
3. Para o login por e-mail, incluir `{{ .Token }}` no modelo "Magic Link". Para celular, configurar
   um provedor de SMS.

**Backend**

```
cd backend
cp .env.example .env      # preencher as chaves
npm install
npm run dev               # API e worker em http://localhost:3333
npm test
```

**Aplicativo**

```
cd mobile
cp .env.example .env      # preencher; usar o IP do computador na Wi-Fi
npm install
npx expo start            # abrir no Expo Go, na mesma rede
```

No Windows, os atalhos em `scripts/` instalam as dependências e iniciam o Expo.

## 15. Publicação

### Backend no Azure

O backend é publicado com o `backend/Dockerfile`: uma imagem Node 24, com API e worker no mesmo
contêiner, verificação de saúde em `/health` e encerramento tranquilo da fila ao parar.

| Peça | Papel |
| --- | --- |
| GitHub Actions | A cada push na `master` em `backend/`, roda typecheck e testes e monta a imagem |
| GitHub Container Registry | Guarda a imagem, de graça para repositório público |
| Azure Container Apps | Roda o backend com HTTPS, escala a zero e no máximo 1 réplica (0,25 vCPU e 0,5 GB) |
| Azure OpenAI | Transcrição (`agrobot-voz`, Canada Central) e interpretação (`agrobot-ia`, North Central US) |

Endereço: `https://agrobot-api.salmongrass-51b1b27e.northcentralus.azurecontainerapps.io`. Travas de
custo: escala a zero, limite de chamadas de IA por usuário, limite de tokens nos modelos, limite
diário de logs e orçamento com alerta. Passo a passo em
[13-publicar-backend-no-azure.md](13-publicar-backend-no-azure.md).

### APK Android

O APK é gerado na nuvem pelo EAS Build (perfil `preview`) com `npm run build:apk` na pasta `mobile`.
O perfil `production` gera o pacote para a Google Play. Passo a passo em
[12-gerar-apk.md](12-gerar-apk.md).

## 16. O que está pronto e o que falta

### Pronto

- Login por código (e-mail ou SMS).
- Cadastro de propriedade e talhões.
- Gravação, envio e processamento da voz em segundo plano, com novas tentativas e proteção contra
  duplicidade.
- Interpretação com saída estruturada, intenção da fala e **vários registros por gravação**.
- Rascunho montado por regras fixas, conferência e confirmação no app.
- Diário de atividades.
- Assistente de perguntas por texto e por voz, com encaminhamento ao técnico.
- Segurança por linha, áudios privados e validação de entradas.
- 65 testes automatizados e avaliação automática da IA.
- Backend publicado no Azure Container Apps, com escala a zero e travas de custo; IA no Azure OpenAI; geração de APK pelo EAS.

### Planejado

| Etapa | Situação |
| --- | --- |
| 1. Base do backend | Feita |
| 2. Fluxo de voz de ponta a ponta | Feita |
| 3. Catálogo de produtos com dias de carência, cálculo e alertas | Assistente feito; carência e alertas pendentes |
| 4. Modo offline persistente | Pendente (hoje a fila do app fica só na memória e se perde ao fechar o app) |
| 5. Piloto com cinco produtores | Pendente |
| 6. Módulo da cooperativa (painel, convites, consentimento LGPD) | Pendente |

Também planejados: edição de atividade, tela de configurações, monitoramento de erros (Sentry) e
métricas de uso (PostHog).

## 17. Hipóteses de validação

| Hipótese | Como testar | Situação |
| --- | --- | --- |
| 1. Produtores com pouca familiaridade digital registram atividades só por voz | Cinco produtores, sem treinamento | Não testada; depende do piloto |
| 2. Voz, backend e IA interpretam corretamente os termos rurais | `npm run eval`, meta de 85% dos campos essenciais | Ferramenta pronta; faltam gravações reais |
| 3. O sistema identifica o período de carência | Registrar aplicações e consultar | Não testada; a regra de carência ainda será criada |

**Nenhuma hipótese foi validada com produtores reais até agora.** Ver
[08-hipoteses-de-validacao.md](08-hipoteses-de-validacao.md).

## 18. Custos, riscos e métricas

### Custos de operação

| Item | Custo |
| --- | --- |
| Supabase | Plano gratuito atende o MVP (projetos parados por cerca de uma semana são pausados) |
| Azure OpenAI | Pago por uso (na fase acadêmica, sai dos créditos do Azure for Students); estimativa de R$ 0,90 a R$ 4,50 por produtor ativo/mês (transcrição + interpretação) |
| Servidor do backend | Azure Container Apps com escala a zero: com pouco uso, deve caber na cota gratuita mensal; orçamento com alerta em US$ 10 por mês |
| SMS de login | Opcional; o login por e-mail é gratuito |
| Lojas | Google Play: taxa única; Apple: taxa anual |

Faixa total para planejamento: **R$ 8 a R$ 15 por produtor ativo/mês**, incluindo suporte.

### Principais riscos

Baixa familiaridade digital, desconfiança no registro por voz, sotaque e ruído, internet instável no
campo, custo de IA, interpretação errada, dependência de provedores de IA, necessidade de validação
agronômica e LGPD. Detalhes em [02-riscos-e-metricas.md](02-riscos-e-metricas.md).

### Métricas

- **Produto:** ativação, retenção, registros por produtor, taxa de sucesso da voz, correções manuais,
  tempo por registro e satisfação.
- **Técnicas:** acerto da transcrição e da extração (produto, quantidade, data, local), tempo de
  processamento e falhas de sincronização.

## 19. Histórico: do N8N ao backend próprio

O protótipo inicial usava o **N8N**, uma ferramenta visual de automação, para receber o áudio e
chamar a transcrição e a IA. Ele serviu para validar a ideia. Hoje o N8N **não é mais usado**: tudo
foi reescrito em código.

| Papel do N8N | Substituto em código |
| --- | --- |
| Receber o áudio (webhook) | Rota `POST /v1/voice-jobs` |
| Encadear transcrição, interpretação e validação | `processVoiceJob`, executado pelo worker |
| Repetir em caso de falha | Fila pg-boss: até 3 novas tentativas |
| Guardar credenciais | `.env` e variáveis de ambiente |
| Ver execuções e erros | Tabela `voice_jobs` e logs |
| Editar prompts | Prompts no código, versionados no Git |

**Motivos:** tudo versionado no Git (inclusive os prompts), testes e avaliação automáticos, um serviço
a menos para hospedar, uma só linguagem no projeto e mais controle sobre segurança. Detalhes em
[10-proposta-arquitetura-sem-n8n.md](10-proposta-arquitetura-sem-n8n.md).

## 20. Glossário

- **Talhão:** subdivisão da propriedade onde se planta uma cultura.
- **Período de carência:** dias mínimos entre a aplicação de um defensivo e a colheita.
- **Rascunho:** dados extraídos da fala, mostrados ao produtor para conferir antes de salvar.
- **Intenção:** o que o produtor quis com a fala: `registro`, `pergunta`, `ambos` ou `incerto`.
- **Worker:** parte do backend que processa os áudios em segundo plano.
- **Fila de tarefas:** lista de áudios aguardando processamento, com novas tentativas em caso de falha.
- **Login por código (OTP):** código enviado por e-mail ou SMS, sem senha.
- **RLS (segurança por linha):** regra do banco que limita cada usuário aos próprios registros.
- **B2B2C:** a empresa vende para organizações, que oferecem o produto às pessoas.

## 21. Índice dos documentos

| Documento | Assunto |
| --- | --- |
| [01-analise-financeira.md](01-analise-financeira.md) | Modelo de negócio, custos e preços |
| [02-riscos-e-metricas.md](02-riscos-e-metricas.md) | Riscos e métricas |
| [03-documentacao-do-app.md](03-documentacao-do-app.md) | Funcionalidades do aplicativo |
| [04-documentacao-da-api.md](04-documentacao-da-api.md) | Rotas da API |
| [05-arquitetura-react-native.md](05-arquitetura-react-native.md) | Arquitetura do aplicativo |
| [06-business-model-canvas.md](06-business-model-canvas.md) | Business Model Canvas |
| [07-ecossistema-de-inovacao.md](07-ecossistema-de-inovacao.md) | Parceiros e ecossistema |
| [08-hipoteses-de-validacao.md](08-hipoteses-de-validacao.md) | Hipóteses e testes |
| [09-sintese-executiva.md](09-sintese-executiva.md) | Síntese executiva |
| [10-proposta-arquitetura-sem-n8n.md](10-proposta-arquitetura-sem-n8n.md) | Arquitetura do backend próprio |
| [11-como-rodar-localmente.md](11-como-rodar-localmente.md) | Rodar no computador |
| [12-gerar-apk.md](12-gerar-apk.md) | Gerar o APK |
| [13-publicar-backend-no-azure.md](13-publicar-backend-no-azure.md) | Publicar o backend no Azure |
| [backend/eval/README.md](../backend/eval/README.md) | Avaliação da IA |
