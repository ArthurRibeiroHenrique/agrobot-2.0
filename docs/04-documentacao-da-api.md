# Documentação da API

Estado alvo da API. Hoje o backend implementa `/health`, as três rotas de `voice-jobs` e
`GET /activities`, todas (exceto `/health`) com autenticação. As demais estão planejadas;
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
| GET, POST /activities | Diário agrícola |
| PATCH /activities/:id | Edição de atividade |
| GET /alerts | Alertas do produtor |
| POST /assistant/messages | Pergunta ao assistente |
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

## Rascunho de atividade

Campos devolvidos em `draft`: `activity_type`, `product`, `quantity`, `unit`, `field_name`,
`occurred_at`, `cost`, `currency`, `confidence`, `missing_fields`, `raw_transcript`.
