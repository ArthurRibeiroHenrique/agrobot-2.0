# Documentação da API

Estado alvo da API. Hoje o backend implementa `/health`, as três rotas de `voice-jobs`,
`GET /activities`, `GET/PATCH/DELETE /activities/:id`, `GET/POST /farms` e `GET/POST /fields`, todas (exceto `/health`) com
autenticação. As demais estão planejadas;
ver [10-proposta-arquitetura-sem-n8n.md](10-proposta-arquitetura-sem-n8n.md).

## Base da API

URL sugerida: https://api.agrobot.app/v1 (local: http://localhost:3333/v1)

A rota `/health` fica fora do prefixo `/v1` e não exige token.

## Autenticação

O aplicativo faz o login por OTP direto no Supabase Auth e recebe um token JWT.
Esse token é enviado no header `Authorization: Bearer <token>` e validado pelo backend.
Por isso a API não tem rotas `/auth`.

## Endpoints principais

| Método e rota | Função |
| --- | --- |
| GET /health | Verificação do serviço |
| GET, POST /farms | Propriedades |
| GET, POST /fields | Talhões |
| GET, POST /plantings | Cultura plantada em cada talhão |
| POST /voice-jobs | Envia áudio e cria a tarefa (resposta 202) |
| GET /voice-jobs/:id | Consulta status e rascunho |
| POST /voice-jobs/:id/confirm | Confirma ou corrige o rascunho |
| POST /voice-jobs/:id/ask | Trata a gravação como pergunta e responde |
| GET, POST /activities | Diário agrícola |
| GET, PATCH, DELETE /activities/:id | Detalhes, edição e exclusão de atividade |
| GET /alerts | Alertas do produtor |
| GET, POST /assistant/messages | Histórico e nova pergunta ao assistente |
| GET, POST, DELETE /shares | Compartilhamento do diário |
| DELETE /account | Exclusão definitiva da conta e de todos os dados |
| GET /organizations/:id/metrics | Painel agregado da cooperativa |
| POST /organizations/:id/invites | Convite de produtores |

## Fluxo de voz

1. Aplicativo envia o áudio para POST /voice-jobs, com um `client_id` que evita duplicidade
2. Backend salva o áudio no Storage, cria o registro com status `queued` e enfileira a tarefa
3. Worker transcreve o áudio (`transcribing`)
4. Worker chama o LLM para extrair os dados no formato do esquema (`extracting`)
5. Backend valida os dados e marca o que faltou em `missing_fields` (`needs_confirmation`)
6. Aplicativo consulta GET /voice-jobs/:id e mostra o rascunho
7. Usuário confirma ou corrige em POST /voice-jobs/:id/confirm
8. Atividade é salva (`confirmed`); se for aplicação de defensivo, o alerta de carência é gerado

Em caso de erro, a tarefa é repetida automaticamente; esgotadas as tentativas, o status fica `failed`.

### Registro, pergunta ou os dois

No passo 4, o LLM também classifica a intenção da fala (`intent`):

- `registro`: segue o fluxo acima
- `pergunta`: o assistente responde e o status vai direto para `answered`, com a resposta em `answer`
- `ambos`: o rascunho vai para `needs_confirmation` e a resposta vem junto em `answer`
- `incerto`: vai para `needs_confirmation` e o aplicativo pergunta se o produtor quer anotar ou perguntar

Se a IA errar, o produtor corrige: um rascunho pode virar pergunta (`POST /voice-jobs/:id/ask`) e uma
pergunta respondida ainda pode ser confirmada como registro (`POST /voice-jobs/:id/confirm`).

## Assistente

`POST /assistant/messages` recebe `{ "question": "...", "timezone": "America/Sao_Paulo" }` e devolve
`answer`, `needs_technician` e `reason`. O assistente consulta os talhões e as últimas 30 atividades
do produtor.

`needs_technician` indica que o aplicativo deve mostrar o aviso "Procure um técnico agrícola". Além do
que a IA decide, o código força o encaminhamento quando:

- o assunto é diagnóstico de praga ou doença, dose ou mistura de defensivo, carência ou segurança
- a confiança da resposta fica abaixo de 0,6 (exceto pergunta fora do assunto da lavoura)

`reason`: `nenhum`, `diagnostico_praga_doenca`, `dose_ou_mistura_de_defensivo`,
`carencia_ou_seguranca`, `informacao_insuficiente` ou `fora_do_escopo`. Toda pergunta fica salva em
`assistant_messages`, para acompanhar quantos encaminhamentos acontecem e por quê.

## Rascunho de atividade

Campos devolvidos em `draft`: `activity_type`, `product`, `quantity`, `unit`, `field_id`,
`field_name`, `occurred_at`, `cost`, `currency`, `confidence`, `missing_fields`, `raw_transcript`.

- `activity_type`: plantio, aplicacao, adubacao, irrigacao, colheita, manejo, custo ou outro
- `unit`: kg, g, t, L, mL, sc, ha ou un
- `occurred_at`: data no formato AAAA-MM-DD. Se o produtor não disser a data, o rascunho assume hoje
- `field_id`: preenchido quando o talhão falado bate com um talhão cadastrado
- `missing_fields`: campos obrigatórios para aquele tipo de atividade que não ficaram claros na fala

### Vários talhões na mesma gravação

Uma fala pode relatar trabalho em mais de um talhão ("passei glifosato no talhão 1 e no talhão 2") ou
operações diferentes ("plantei milho na baixada e adubei o talhão 2"). O LLM devolve uma atividade por
talhão e o job traz `drafts`, uma lista de rascunhos na ordem falada. `draft` continua com o primeiro
rascunho, para gravações antigas e versões antigas do aplicativo.

- Quantidade ou custo dito por talhão ("10 litros no 1 e 15 no 2") ou "em cada": vai em cada rascunho
- Um total único para vários talhões ("40 litros nos talhões 1 e 2"): a IA não divide; `quantity` fica
  nula e aparece em `missing_fields` para o produtor informar
- Cada rascunho tem a própria data e o próprio tipo de atividade

Na confirmação, o aplicativo envia `{ "activities": [ { ... }, { ... } ] }`, um item por registro
revisado (o produtor pode remover rascunhos antes de salvar). A resposta é a lista das atividades
criadas, todas com o mesmo `voice_job_id`; ou todas são salvas, ou nenhuma. O formato antigo,
`{ "corrections": { ... } }`, continua aceito e salva um único registro.

## Edição de registros do diário

- `GET /activities/:id` devolve um registro.
- `PATCH /activities/:id` corrige um registro já salvo. Aceita só `activity_type`, `product`,
  `quantity`, `unit`, `field_id`, `field_name`, `occurred_at` (AAAA-MM-DD) e `cost`; outros campos
  são ignorados. Texto vazio vira `null`. Com custo, a moeda fica `BRL`.
- `DELETE /activities/:id` apaga o registro (resposta 204).

Registro inexistente, ou de alguém que não compartilhou o diário com o usuário, responde 404.

## Diário compartilhado

Quem recebeu o acesso na tabela `diary_shares` vê e edita, pelas mesmas rotas, os registros, as
propriedades e os talhões de quem compartilhou. Compartilhar é de mão única.

- `GET /shares` devolve `{ "shared_with": [...], "shared_by": [...] }`: quem vê o meu diário e de
  quem eu vejo o diário. Cada item tem `user_id`, `email` e `created_at`.
- `POST /shares` com `{ "email": "..." }` compartilha o meu diário com essa pessoa (201). Responde 404
  se não há conta com o e-mail, 400 se é o próprio e-mail e 409 se já está compartilhado.
- `DELETE /shares/:memberId` para de compartilhar com essa pessoa (204).
- `DELETE /shares/received/:ownerId` deixa de ver o diário dessa pessoa (204).

## Exclusão de conta

`DELETE /account` apaga a conta de quem está logado (204). Exigida pela LGPD e pela Play Store.

1. Apaga os áudios que ainda estiverem no bucket, na pasta `<userId>/`. Se falhar, responde 500 e a
   conta continua existindo, para a pessoa tentar de novo.
2. Apaga o usuário no Supabase Auth. O `on delete cascade` das tabelas leva junto `voice_jobs`,
   `activities`, `farms`, `fields`, `assistant_messages` e `diary_shares`.

Os registros que a pessoa criou no diário compartilhado de outra também somem, porque ficam com o
`user_id` de quem criou. O app avisa isso antes de confirmar, e a política de privacidade também.

A política de privacidade e a página de exclusão de conta ficam em `site/` e são publicadas no
GitHub Pages: `https://arthurribeirohenrique.github.io/agrobot-2.0/privacidade/` e
`.../excluir-conta/`. São esses os dois links pedidos pela Play Console.
