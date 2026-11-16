# Como publicar o backend no Azure

Guia para colocar a API e o worker na internet, com HTTPS, sem depender do seu computador. O backend
roda no **Azure Container Apps** e a IA no **Azure OpenAI**. O banco, o login e os áudios continuam no
Supabase.

```
Celular (APK) ──HTTPS──► Azure Container Apps: agrobot-api (API + worker)
                             ├─► Azure OpenAI agrobot-ia  (North Central US): gpt-5-mini
                             ├─► Azure OpenAI agrobot-voz (Canada Central):   gpt-4o-mini-transcribe
                             └─► Supabase (login, banco, fila e áudios)
```

## O que está publicado

| Item | Valor |
| --- | --- |
| Assinatura | Azure for Students |
| Resource group | `Agrobot` |
| Endereço da API | `https://agrobot-api.salmongrass-51b1b27e.northcentralus.azurecontainerapps.io` |
| Ambiente | `agrobot-env` (North Central US) |
| Imagem | `ghcr.io/arthurribeirohenrique/agrobot-backend`, montada pelo GitHub Actions |

### Por que essas regiões

A assinatura Azure for Students só libera algumas regiões (política "Allowed resource deployment
regions"): `canadacentral`, `northcentralus`, `belgiumcentral`, `southafricanorth` e `chilecentral`.
Nenhuma delas tinha os dois modelos no modo pago por uso, por isso a transcrição ficou em Canada
Central e a interpretação em North Central US. Para ver a lista da sua assinatura:

```
az policy assignment list --query "[].{nome:displayName, parametros:parameters}" -o json
```

Na assinatura do produto comercial não há essa trava: o ideal é usar um único recurso de IA e
publicar tudo em `brazilsouth`.

## Travas de custo

| Trava | Como está | Onde mudar |
| --- | --- | --- |
| Escala a zero | Sem uso por cerca de 5 minutos, o backend desliga e não cobra. A primeira requisição depois disso liga de novo (alguns segundos a mais) | `--min-replicas` |
| Tamanho | 0,25 vCPU e 0,5 GB, no máximo 1 réplica | `--cpu`, `--memory`, `--max-replicas` |
| Limite por usuário | 60 chamadas de IA por hora; acima disso, erro 429 | Variável `AI_RATE_LIMIT_PER_HOUR` |
| Limite dos modelos | 50 mil tokens por minuto em cada deployment | Foundry > Modelos > deployment > Editar |
| Logs | Até 0,1 GB por dia em cada espaço do Log Analytics | Log Analytics > Uso e custos estimados > Limite diário |
| Registro de imagens | GitHub Container Registry, gratuito para repositório público | `.github/workflows/backend-image.yml` |
| Orçamento | `agrobot-mensal`: US$ 10 por mês, com e-mail em 50%, 80% e 100% | Gerenciamento de Custos > Orçamentos |
| Cache de prompt | Regras fixas no início dos prompts e dados do produtor no fim: cerca de 1.024 dos ~1.270 tokens de entrada vêm do cache, cobrados a um décimo | `extraction.service.ts` e `assistant.service.ts` |
| Áudio apagado | O áudio sai do Supabase Storage quando o processamento termina (ou na última tentativa que falhou) | Variável `KEEP_AUDIO_AFTER_PROCESSING` |
| Gravação de voz | App grava em mono, 16 kHz e 32 kbps (cerca de 4 vezes menor) e para sozinho em 2 minutos | `mobile/src/hooks/useVoiceRecording.ts` e `new-voice.tsx` |

A conta Azure for Students não cobra no cartão: quando os créditos acabam, os serviços são suspensos.

A contagem do limite por usuário fica na memória do backend. Ela funciona porque há no máximo uma
réplica, e zera quando o backend desliga.

### Por que a escala a zero não atrapalha a fila

O worker roda no mesmo processo da API. O envio do áudio acorda o backend, e o app consulta o
andamento a cada poucos segundos enquanto o áudio é processado, o que o mantém ligado. Se uma nova
tentativa ficar para depois do desligamento, a tarefa continua guardada no PostgreSQL e é processada
na próxima vez que o backend ligar.

## Ferramentas

- Azure CLI: `winget install Microsoft.AzureCLI`, depois `az login`
- Extensão do Container Apps: `az extension add -n containerapp`

## Como foi criado

Os comandos abaixo foram usados na primeira publicação. Servem de referência para recriar tudo em
outra assinatura, trocando nomes e regiões.

### 1. IA

Dois recursos do Microsoft Foundry, `agrobot-ia` e `agrobot-voz`, criados pelo portal. Os
deployments, com o limite de tokens:

```
az cognitiveservices account deployment create -n agrobot-ia -g Agrobot --deployment-name gpt-5-mini --model-name gpt-5-mini --model-version 2025-08-07 --model-format OpenAI --sku-name GlobalStandard --sku-capacity 50
az cognitiveservices account deployment create -n agrobot-voz -g Agrobot --deployment-name gpt-4o-mini-transcribe --model-name gpt-4o-mini-transcribe --model-version 2025-12-15 --model-format OpenAI --sku-name GlobalStandard --sku-capacity 50
```

O endpoint de cada recurso é o da linha "OpenAI Language Model Instance API":

```
az cognitiveservices account show -n agrobot-ia -g Agrobot --query "properties.endpoints.\"OpenAI Language Model Instance API\"" -o tsv
```

### 2. Imagem

Cada push na `master` que mexe em `backend/` roda o workflow **Imagem do backend**: typecheck,
testes e montagem da imagem, guardada em `ghcr.io/arthurribeirohenrique/agrobot-backend` com a tag
`sha-<commit>` e, na `master`, também `latest`. O pacote é público, então o Azure baixa sem senha.

### 3. Ambiente e limite de logs

```
az provider register -n Microsoft.App
az monitor log-analytics workspace update -g Agrobot -n NOME_DO_ESPACO_DE_LOGS --quota 0.1
az containerapp env create -n agrobot-env -g Agrobot -l northcentralus --logs-workspace-id ID_DO_ESPACO --logs-workspace-key CHAVE_DO_ESPACO
```

### 4. Aplicativo

As chaves ficam como *secrets* do Container Apps e as variáveis apontam para eles com `secretref:`.
Nunca coloque as chaves no Git.

```
az containerapp create -n agrobot-api -g Agrobot --environment agrobot-env \
  --image ghcr.io/arthurribeirohenrique/agrobot-backend:latest \
  --target-port 3333 --ingress external \
  --min-replicas 0 --max-replicas 1 --cpu 0.25 --memory 0.5Gi \
  --secrets azure-openai-key=... azure-openai-transcription-key=... supabase-service-role-key=... database-url=... \
  --env-vars PORT=3333 AI_PROVIDER=azure \
    AZURE_OPENAI_ENDPOINT=https://agrobot-ia.openai.azure.com AZURE_OPENAI_API_KEY=secretref:azure-openai-key \
    AZURE_OPENAI_API_VERSION=2025-04-01-preview AZURE_OPENAI_LLM_DEPLOYMENT=gpt-5-mini \
    AZURE_OPENAI_TRANSCRIPTION_ENDPOINT=https://agrobot-voz.openai.azure.com \
    AZURE_OPENAI_TRANSCRIPTION_API_KEY=secretref:azure-openai-transcription-key \
    AZURE_OPENAI_TRANSCRIPTION_DEPLOYMENT=gpt-4o-mini-transcribe \
    SUPABASE_URL=https://SEU-PROJETO.supabase.co SUPABASE_SERVICE_ROLE_KEY=secretref:supabase-service-role-key \
    SUPABASE_AUDIO_BUCKET=voice-audio DATABASE_URL=secretref:database-url RUN_WORKER=true AI_RATE_LIMIT_PER_HOUR=60
```

`DATABASE_URL` precisa ser a do **Session pooler** do Supabase (porta 5432), como no ambiente local.

### 5. Orçamento

Criado pela API de Consumo do Azure (`Microsoft.Consumption/budgets`), ou pelo portal em
**Gerenciamento de Custos > Orçamentos > Adicionar**.

## Publicar uma versão nova

1. Faça o merge na `master` e envie para o GitHub
2. Espere o workflow **Imagem do backend** terminar, na aba Actions do GitHub
3. Aponte o backend para a imagem nova, pela tag do commit:

```
az containerapp update -n agrobot-api -g Agrobot --image ghcr.io/arthurribeirohenrique/agrobot-backend:sha-COMMIT_COMPLETO
```

Usar a tag do commit, e não `latest`, deixa claro qual versão está no ar e permite voltar para a
anterior com o mesmo comando.

## Trocar uma chave

```
az containerapp secret set -n agrobot-api -g Agrobot --secrets azure-openai-key=NOVA_CHAVE
az containerapp revision restart -n agrobot-api -g Agrobot --revision $(az containerapp show -n agrobot-api -g Agrobot --query properties.latestRevisionName -o tsv)
```

## Conferir se está no ar

- `https://agrobot-api.salmongrass-51b1b27e.northcentralus.azurecontainerapps.io/health` deve mostrar
  `"status":"ok"`
- `.../v1/activities` deve dar erro 401: a rota exige login
- Logs: `az containerapp logs show -n agrobot-api -g Agrobot --type console --tail 50`

## Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| `RequestDisallowedByAzure` ao criar um recurso | Região fora da lista liberada da assinatura |
| Transcrição com erro 404 (`DeploymentNotFound`) | Nome do deployment diferente de `AZURE_OPENAI_TRANSCRIPTION_DEPLOYMENT` |
| `password authentication failed` nos logs | Senha errada na `DATABASE_URL`; redefina em Supabase > Database |
| Primeira resposta demora alguns segundos | Normal: o backend estava desligado pela escala a zero |
| Erro 429 no app | O usuário passou do limite de chamadas de IA por hora |
| Erro 500 com `column ... does not exist` nos logs | Migração pendente no Supabase: aplique os arquivos de `backend/supabase/migrations` que faltam, em ordem |

## Histórico da hospedagem

| Opção | O que aconteceu | Onde ver |
| --- | --- | --- |
| Túnel do ngrok | Testado para acessar o backend pelo APK, com o computador ligado. A rede com Fortinet bloqueou o domínio, e o celular abriu o endereço com a tela em branco. Removido | Commit `4a8832f` |
| Railway | Guia escrito, mas nunca colocado em uso: o plano que atenderia um processo sempre ligado é pago | Commit `4611d00` |
| Coolify na Oracle Always Free | Guia e Dockerfile escritos, mas não colocados em uso: o projeto passou a usar o Azure | Commit `46c86a6` |
| Azure Container Apps | Opção atual, junto com o Azure OpenAI | Este guia |
