# AgroBot 2.0 — Proposta de documentação e arquitetura sem N8N

Proposta para construir o AgroBot 2.0 inteiramente em código (VS Code), sem nenhum fluxo no N8N.
Base: a atividade "Business Model Canvas — Gestão da Inovação" e o estado atual deste repositório.

## 1. Resumo da decisão

| Tema | Decisão |
| --- | --- |
| Linguagem | **TypeScript** em tudo (aplicativo, backend e esquemas compartilhados) |
| Aplicativo | React Native com Expo e Expo Router (já iniciado em `mobile/`) |
| Backend | Node.js + Express (já iniciado em `backend/`, na branch `master`) |
| Banco, login e arquivos | Supabase: PostgreSQL, Auth (OTP) e Storage (áudios) |
| Orquestração (papel do N8N) | Fila de tarefas em código com **pg-boss**, que usa o próprio PostgreSQL |
| IA | Transcrição (Whisper) e LLM com saída estruturada, atrás de uma interface trocável |
| Regras agrícolas (carência) | Código determinístico + tabela de produtos, **nunca** decidido pelo LLM |

Por que uma única linguagem: a equipe é pequena, o aplicativo já é TypeScript e os mesmos esquemas
Zod validam o dado no celular, na API e na resposta da IA. Python (FastAPI) seria a alternativa se
o projeto fosse treinar modelos próprios, o que não é o caso: a IA é consumida por API.

## 2. O que o N8N fazia e o que entra no lugar

| Papel do N8N | Substituto em código |
| --- | --- |
| Receber o áudio (webhook) | Rota `POST /voice-jobs` no Express |
| Encadear transcrição → extração → validação | Função `processVoiceJob`, executada por um worker |
| Repetir em caso de falha | Tentativas automáticas com espera crescente (pg-boss) |
| Guardar credenciais | Arquivo `.env` local e variáveis de ambiente na hospedagem |
| Ver execuções e erros | Tabela `voice_jobs` (status, erro, tentativas) + logs + Sentry |
| Tarefas agendadas | Agendamento do pg-boss (ex.: verificação diária de carência) |
| Editar prompts visualmente | Prompts versionados no Git, em `backend/src/ai/prompts/` |

Ganhos: tudo versionado e revisável, testes automatizados, um serviço a menos para hospedar.
Perda: não há mais a tela visual do fluxo; o diagrama da seção 4 passa a ser a referência.

## 3. Visão geral da arquitetura

```
┌──────────────────────┐        HTTPS + JWT        ┌───────────────────────────┐
│  Aplicativo (Expo)   │ ────────────────────────► │  API (Express)            │
│  - grava áudio       │ ◄──────────────────────── │  - valida JWT do Supabase │
│  - fila offline      │      rascunho / diário    │  - regras de negócio      │
│  - confirma rascunho │                           │  - enfileira tarefas      │
└──────────┬───────────┘                           └────────────┬──────────────┘
           │ login por OTP                                      │
           ▼                                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Supabase: Auth │ PostgreSQL (dados + fila pg-boss) │ Storage (áudios)        │
└──────────────────────────────────────────────────────────────────────────────┘
                                                                ▲
                                                   ┌────────────┴──────────────┐
                                                   │  Worker (mesmo código)    │
                                                   │  transcreve → extrai →    │──► APIs de IA
                                                   │  valida → gera alertas    │
                                                   └───────────────────────────┘
```

API e worker são o mesmo projeto (`backend/`) iniciado de dois modos. No MVP podem rodar no
mesmo processo; separar depois é só mudar o comando de inicialização.

## 4. Fluxo de voz (o coração do produto)

1. O produtor segura o botão e fala. O áudio é salvo no aparelho com um `client_id` (UUID).
2. Com internet, o aplicativo envia `POST /voice-jobs` (áudio + `client_id` + talhão, se escolhido).
   Sem internet, o item fica na fila local e é enviado quando a conexão voltar.
3. A API grava o áudio no Storage, cria o registro em `voice_jobs` com status `queued`,
   enfileira a tarefa e responde `202`.
4. O worker transcreve o áudio (status `transcribing`).
5. O worker pede ao LLM um JSON no formato do esquema Zod, enviando como contexto os talhões,
   culturas e produtos já cadastrados daquele produtor (status `extracting`).
6. O código valida: esquema, unidades, talhão existente, data plausível. O que faltar entra em
   `missing_fields`. Status `needs_confirmation`.
7. O aplicativo consulta `GET /voice-jobs/:id` até o rascunho ficar pronto e mostra a tela de
   confirmação, com os campos duvidosos destacados.
8. O produtor confirma ou corrige (`POST /voice-jobs/:id/confirm`). A atividade é gravada.
9. Se for aplicação de defensivo, o código calcula a data de liberação da colheita e cria o alerta.

Estados de `voice_jobs`: `queued → transcribing → extracting → needs_confirmation → confirmed`,
ou `failed` após esgotar as tentativas. O `client_id` torna o envio idempotente: reenviar o mesmo
áudio não cria registro duplicado.

## 5. Inteligência cruzada e carência

O período de carência é uma informação de segurança alimentar; um erro aqui é grave. Por isso:

- A tabela `products` guarda os dias de carência por produto e cultura, conferidos com a bula e
  com o AGROFIT (Ministério da Agricultura), com apoio técnico da Epagri.
- O cálculo é feito em código: `data de liberação = data da aplicação + dias de carência`.
- O LLM só interpreta a pergunta e redige a resposta. Quando o produtor pergunta "posso colher o
  talhão 2?", o LLM chama a função `verificar_carencia(talhao)` e responde com o resultado dela.
- Produto não encontrado na tabela gera a resposta "não sei, consulte a bula", nunca um palpite.

O assistente (`POST /assistant/messages`) usa o mesmo mecanismo para as demais consultas ao
histórico: `listar_atividades`, `resumo_de_custos`, `ultima_aplicacao`.

## 6. Modelo de dados

| Tabela | Conteúdo |
| --- | --- |
| `profiles` | Dados do usuário, ligados ao usuário do Supabase Auth |
| `organizations` | Cooperativas e empresas (clientes pagantes) |
| `memberships` | Vínculo usuário–organização, com papel (produtor, técnico, gestor) |
| `farms` | Propriedades |
| `fields` | Talhões de cada propriedade |
| `plantings` | Cultura plantada em um talhão, com datas de plantio e colheita prevista |
| `products` | Catálogo de insumos, com dias de carência por cultura |
| `activities` | Registros do diário (plantio, aplicação, colheita, custo) |
| `voice_jobs` | Áudio, transcrição, rascunho, status, erro e tentativas |
| `alerts` | Alertas gerados (carência vigente, liberação de colheita) |
| `consents` | Autorização do produtor para compartilhar dados com a organização |

Todas as tabelas de dados do produtor têm `user_id` ou `farm_id`, e a API filtra sempre por ele.
O painel da cooperativa lê apenas dados agregados de produtores com consentimento registrado
(LGPD), o que sustenta o modelo B2B2C descrito no Canvas.

## 7. API

Base: `/v1`. Autenticação: token JWT emitido pelo Supabase Auth, no cabeçalho `Authorization`.
O login por OTP é feito pelo aplicativo direto no Supabase; a API não precisa de rotas `/auth`.

| Método e rota | Função |
| --- | --- |
| `GET/POST /farms`, `GET/POST /fields`, `GET/POST /plantings` | Cadastro da propriedade |
| `POST /voice-jobs` | Envia áudio e cria a tarefa (resposta `202`) |
| `GET /voice-jobs/:id` | Consulta status e rascunho |
| `POST /voice-jobs/:id/confirm` | Confirma ou corrige o rascunho |
| `GET/POST /activities`, `PATCH /activities/:id` | Diário agrícola |
| `GET /alerts` | Alertas do produtor |
| `POST /assistant/messages` | Pergunta ao assistente |
| `GET /organizations/:id/metrics` | Painel agregado da cooperativa |
| `POST /organizations/:id/invites` | Convite de produtores |
| `GET /health` | Verificação do serviço |

O arquivo `api/openapi.yaml` passa a ser gerado a partir dos esquemas Zod, para não divergir do código.

## 8. Estrutura do repositório

```
AgroBot2.0/
├── mobile/                  aplicativo Expo
├── backend/
│   ├── src/
│   │   ├── server.ts        inicia a API
│   │   ├── worker.ts        inicia o worker
│   │   ├── config/          leitura e validação do .env
│   │   ├── middlewares/     autenticação e tratamento de erros
│   │   ├── routes/          rotas HTTP (health, voice, activities)
│   │   ├── services/        regras de negócio, Storage, transcrição e extração
│   │   ├── schemas/         esquemas Zod
│   │   ├── jobs/            fila pg-boss e tarefas agendadas
│   │   ├── ai/              (a criar) prompts e ferramentas do assistente
│   │   └── rules/           (a criar) carência e validações agrícolas
│   ├── supabase/migrations/ esquema do banco versionado
│   ├── eval/                (a criar) áudios de teste + JSON esperado
│   └── test/
├── packages/shared/         esquemas Zod e tipos usados por mobile e backend
├── api/openapi.yaml
└── docs/
```

## 9. O que é necessário

**Na máquina de cada integrante**
- Node.js LTS, Git e VS Code (extensões: ESLint, Prettier, Expo Tools)
- Celular Android com o aplicativo de desenvolvimento instalado, ou emulador do Android Studio
- Mac com Xcode apenas para gerar a versão iOS (ou usar o build em nuvem do EAS)

**Contas e serviços**
- Supabase (plano gratuito atende o MVP)
- Provedor de IA para transcrição e LLM (pago por uso)
- Expo/EAS para gerar os instaladores
- Hospedagem do backend em contêiner (Railway, Render ou Fly.io)
- Provedor de SMS para o OTP por telefone (custo por mensagem)
- Google Play (taxa única) e Apple Developer (taxa anual), apenas na publicação
- Sentry (erros) e PostHog (uso), ambos com plano gratuito

**Bibliotecas a acrescentar no backend**
`pg-boss` (fila), `vitest` e `supertest` (testes), `pino` (logs), `express-rate-limit`.

## 10. Ajustes no código que já existe

**Backend — feito na etapa 1**
1. Nomes de arquivos corrigidos para bater com os imports; `activities.routes` criado. O projeto compila.
2. Autenticação: todas as rotas de `/v1` exigem o token do Supabase, e os registros têm dono (`user_id`).
3. O áudio vai para um bucket privado do Supabase Storage.
4. O processamento passa pela fila pg-boss, com até 3 novas tentativas.
5. Erros internos não são mais devolvidos ao cliente; áudio ausente retorna 400.
6. Reenvio com o mesmo `client_id` não duplica o registro.

**Backend — pendente**
1. `occurred_at` é texto e `field_name` é texto livre. Trocar por data real e por referência ao talhão.
2. A extração usa "modo JSON" livre. Trocar por saída estruturada com o esquema, e enviar o
   contexto do produtor (talhões e produtos) no prompt.
3. Tabelas e rotas de propriedades, talhões, produtos, alertas e organizações.

**Aplicativo (`mobile/`)**
1. As telas são esqueletos; `services/api.ts` aponta para `localhost` e não envia o token.
2. `package.json` usa `expo/AppEntry.js`; com Expo Router o correto é `expo-router/entry`.
3. Atualizar o SDK do Expo. `expo-av` foi descontinuado (usar `expo-audio`) e `sentry-expo`
   também (usar `@sentry/react-native`).
4. A fila offline está só em memória e se perde ao fechar o aplicativo. Persistir com `expo-sqlite`.
5. `react-native-mmkv` não funciona no Expo Go; exige build de desenvolvimento.

## 11. Trechos da atividade a atualizar

| Trecho | Texto proposto |
| --- | --- |
| Estágio atual | "Protótipo: o fluxo de voz foi validado experimentalmente e está sendo reimplementado em código próprio (backend em TypeScript e aplicativo em React Native), rumo ao MVP." |
| 6. Recursos-chave | "…tecnologias de infraestrutura (backend próprio em Node.js/TypeScript, PostgreSQL/Supabase para banco de dados, autenticação e armazenamento de áudio) e integração de APIs de inteligência artificial para transcrição e interpretação." |
| 7. Atividades-chave | "…construção do banco de dados relacional, manutenção do backend e do processamento assíncrono de áudio, curadoria da base de produtos e períodos de carência, e avaliação contínua da precisão da IA." |
| 9. Estrutura de custos | "Infraestrutura Cloud: hospedagem do backend e Supabase. Envio de SMS para login. Publicação: taxa única do Google Play e taxa anual da Apple." |
| Hipótese 2 | "A integração entre reconhecimento de voz, backend e inteligência artificial será capaz de…" Teste: submeter as gravações ao conjunto de avaliação automatizado (`backend/eval`). Critério sugerido: ao menos 85% dos campos essenciais corretos. |
| Síntese | Trocar "transcrição Whisper via N8N" por "transcrição e modelos de linguagem orquestrados por backend próprio". |

Observação sobre o Canvas: a taxa do Google Play é paga uma única vez, não anualmente como consta no bloco 9.

## 12. Como a arquitetura atende às hipóteses

| Hipótese | Suporte técnico |
| --- | --- |
| 1. Registro só por voz, sem treinamento | Botão único de gravação e tela de confirmação; o PostHog mede quantos registros são concluídos sem digitação |
| 2. IA entende termos e sotaques rurais | `backend/eval`: gravações reais + JSON esperado; o comando `npm run eval` mede o acerto por campo a cada mudança de prompt ou modelo |
| 3. Alerta correto de carência | Regras em `backend/src/rules/` com testes automatizados usando casos conferidos em fontes técnicas |

## 13. Etapas sugeridas

1. **Base**: corrigir o backend para compilar, migrações do banco, autenticação, Storage e fila.
2. **Fluxo de voz ponta a ponta**: gravar, enviar, rascunho, confirmar, diário. Montar o `eval`.
3. **Carência e alertas**: catálogo de produtos, regra, notificação, assistente com consulta ao histórico.
4. **Offline**: fila persistente e sincronização.
5. **Piloto**: teste com os cinco produtores (hipótese 1) e ajustes.
6. **Cooperativa**: organizações, convites, consentimento e painel agregado.
