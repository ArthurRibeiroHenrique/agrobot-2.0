# Como publicar o backend no Railway

Guia para colocar a API e o worker na internet, com HTTPS, sem depender do seu computador. O código
já está pronto: o Railway instala as dependências, roda `npm run build` e inicia com `npm start`.
Só a configuração abaixo é feita no painel. A API e o worker rodam juntos em um único serviço.

## Antes de começar

- Todas as migrações de `backend/supabase/migrations` aplicadas no Supabase, em ordem
- O código que será publicado já no GitHub, na branch `master`
- Conta em https://railway.com, entrando com o GitHub

Custos: o plano Trial dá um crédito único de US$ 5, e o Hobby custa US$ 5 por mês, com US$ 5 de uso
incluídos. O plano Free dá só US$ 1 por mês, o que pode não bastar para um processo ligado o tempo
todo. Confira os valores atuais em https://docs.railway.com/reference/pricing/plans.

## 1. Criar o serviço

1. No painel, clique em **New Project > Deploy from GitHub repo** e escolha `agrobot-2.0`
2. Se o repositório não aparecer, clique em **Configure GitHub App** e libere o acesso a ele
3. O primeiro deploy vai falhar, porque ainda faltam as configurações seguintes. É normal

## 2. Configurar o serviço

Na aba **Settings** do serviço:

| Opção | Valor | Por quê |
| --- | --- | --- |
| Root Directory | `/backend` | O repositório também tem o aplicativo; só a pasta do backend vai para o servidor |
| Branch | `master` | Cada push nessa branch publica uma nova versão |
| Watch Paths | `/backend/**` | Mudanças só no aplicativo ou na documentação não geram deploy |
| Healthcheck Path | `/health` | A versão nova só entra no ar depois de responder |
| Restart Policy | On Failure | Reinicia o processo se ele cair |
| Serverless (App Sleeping) | Desligado | O worker precisa ficar ligado para processar os áudios |
| Region | US East (Virginia) | Em princípio, a região mais próxima do Brasil entre as disponíveis |

## 3. Cadastrar as variáveis

Na aba **Variables**, clique em **Raw Editor** e cole, com os mesmos valores do seu `backend/.env`:

```
RAILPACK_NODE_VERSION=24
OPENAI_API_KEY=...
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_LLM_MODEL=gpt-5-mini
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_AUDIO_BUCKET=voice-audio
DATABASE_URL=...
RUN_WORKER=true
```

Cuidados:

- **Não cadastre `PORT`.** O Railway define a porta sozinho. Se o `PORT=3333` for junto, o endereço
  público pode não chegar até a API
- `DATABASE_URL` precisa ser a do **Session pooler** (porta 5432), como no ambiente local. A conexão
  direta do Supabase usa IPv6 e o Transaction pooler (6543) não funciona com a fila
- `ALLOWED_ORIGINS` não é necessária: o aplicativo não passa pela verificação de origem, que vale só
  para navegadores
- Essas chaves ficam só no Railway. Nunca as coloque no aplicativo nem no Git

Ao salvar, clique em **Deploy** para aplicar as mudanças.

## 4. Gerar o endereço público

1. Em **Settings > Networking**, clique em **Generate Domain** e aceite a porta sugerida
2. Abra `https://SEU-BACKEND.up.railway.app/health` no navegador. Deve aparecer `"status":"ok"`
3. Abra `https://SEU-BACKEND.up.railway.app/v1/activities`. Deve aparecer erro 401: é o esperado,
   pois a rota exige login

## 5. Ligar o aplicativo ao backend

Cadastre o endereço no EAS, com `/v1` no final, e gere o APK seguindo o
[guia do APK](12-gerar-apk.md):

```
npx eas-cli@latest env:create --environment preview --visibility plaintext --name EXPO_PUBLIC_API_URL --value https://SEU-BACKEND.up.railway.app/v1
```

Se a variável já existir, atualize o valor:

```
npx eas-cli@latest env:update --variable-name EXPO_PUBLIC_API_URL --variable-environment preview --value https://SEU-BACKEND.up.railway.app/v1
```

Para usar esse backend também no Expo Go, troque o `EXPO_PUBLIC_API_URL` do `mobile/.env`.

## Novas versões

Cada push na `master` que altere a pasta `backend` publica o backend sozinho. Migrações novas
**não** são aplicadas automaticamente: rode-as no SQL Editor do Supabase antes do push.

Trocar o endereço do backend exige gerar um APK novo. Por isso, não apague o domínio gerado.

## Problemas comuns

Os erros aparecem na aba **Deployments**, em **Build Logs** e **Deploy Logs**.

| Sintoma | Causa provável |
| --- | --- |
| `ZodError` citando uma variável | Variável faltando ou vazia no passo 3 |
| `Falha ao iniciar o backend`, com erro de conexão ou senha | `DATABASE_URL` errada, ou projeto do Supabase pausado (acontece após cerca de uma semana parado no plano gratuito) |
| Build procurando arquivos do aplicativo ou sem `package.json` | Root Directory diferente de `/backend` |
| Healthcheck falhando, sem erro no log | `PORT` cadastrada à mão: apague a variável |
| `/health` funciona, mas o áudio fica parado em "processando" | `RUN_WORKER` diferente de `true`, ou erro da OpenAI nos Deploy Logs (chave ou saldo) |
| Serviço parado do nada | Crédito do plano esgotado: confira em **Usage** |
