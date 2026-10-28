# Como gerar o APK do AgroBot 2.0

Guia para gerar um arquivo `.apk` e instalar o aplicativo no Android sem o Expo Go. O build é feito
na nuvem pelo **EAS Build** (serviço da Expo), então não é preciso instalar o Android Studio.

## 1. Antes de começar: backend na internet

O APK instalado não consegue falar com o backend rodando no seu computador:

- fora da sua rede Wi-Fi, o IP do computador (ex.: `192.168.0.10`) não existe
- o Android bloqueia endereços `http://` no aplicativo instalado; é preciso `https://`

Por isso o backend precisa estar hospedado em um serviço com HTTPS que mantenha o processo ligado o
tempo todo, por causa do worker da fila (ex.: Railway, Fly.io ou Render no plano pago). Antes de
seguir, confira se `https://SEU-BACKEND/health` responde `{"status":"ok"}` e se todas as migrações de
`backend/supabase/migrations` foram aplicadas no Supabase.

### Sem hospedagem: túnel gratuito do ngrok

Para testes e apresentações, o backend pode continuar no seu computador: o ngrok cria um endereço
`https://` fixo que leva até ele. O aplicativo só funciona enquanto o computador estiver ligado, com
o backend e o túnel abertos.

1. Instale o ngrok (Microsoft Store ou https://ngrok.com/download) e entre na sua conta com
   `ngrok config add-authtoken SEU_TOKEN` (o token fica em https://dashboard.ngrok.com/get-started/your-authtoken)
2. Em https://dashboard.ngrok.com/domains, crie o domínio gratuito. A conta gratuita tem direito a
   um, e ele não muda (ex.: `nome-do-dominio.ngrok-free.app`)
3. No `backend/.env`, preencha `NGROK_DOMAIN=nome-do-dominio.ngrok-free.app`
4. Abra `scripts/iniciar-backend-com-tunel.bat`. Ele abre duas janelas: o backend (`npm run dev`) e
   o túnel (`npm run tunnel`)
5. Confira no navegador: `https://nome-do-dominio.ngrok-free.app/health`
6. No passo 3 abaixo, use `EXPO_PUBLIC_API_URL=https://nome-do-dominio.ngrok-free.app/v1`

O domínio é sempre o mesmo, então o APK não precisa ser gerado de novo a cada vez que o túnel abre.
Se depois o backend for para uma hospedagem, gere um APK novo com a URL do servidor.

Se aparecer `Cannot find file at '..\lib\ngrok\tools\ngrok.exe'`, é um ngrok antigo do Chocolatey
quebrado no PATH. O `npm run tunnel` já procura o da Microsoft Store primeiro; para limpar, rode
`choco uninstall ngrok` num terminal como administrador.

## 2. Conta na Expo e vínculo do projeto

Crie uma conta gratuita em https://expo.dev. Depois, na pasta `mobile`:

```
npx eas-cli@latest login
npx eas-cli@latest init
```

O `init` cria o projeto na sua conta e grava o `projectId` no `app.json`. Faça commit dessa mudança.

## 3. Variáveis do aplicativo

O arquivo `mobile/.env` **não vai para o build**: ele está no `.gitignore` e o EAS não envia
arquivos ignorados. As variáveis precisam ser cadastradas no EAS, para o ambiente `preview` (o mesmo
nome usado no perfil do `eas.json`):

```
npx eas-cli@latest env:create --environment preview --visibility plaintext --name EXPO_PUBLIC_API_URL --value https://SEU-BACKEND/v1
npx eas-cli@latest env:create --environment preview --visibility plaintext --name EXPO_PUBLIC_SUPABASE_URL --value https://SEU-PROJETO.supabase.co
npx eas-cli@latest env:create --environment preview --visibility plaintext --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value SUA_CHAVE_ANON
```

Cuidados:

- As variáveis `EXPO_PUBLIC_*` ficam gravadas dentro do APK no momento do build. Se mudar alguma,
  gere o APK de novo
- Só a chave **anon** do Supabase pode ir para o aplicativo. A `SUPABASE_SERVICE_ROLE_KEY` e a
  `OPENAI_API_KEY` ficam só no servidor do backend
- Sem `EXPO_PUBLIC_SUPABASE_URL`, o aplicativo fecha logo ao abrir. Sem `EXPO_PUBLIC_API_URL`, ele
  tenta `localhost` e mostra "Sem conexão com o servidor"

Para conferir o que está cadastrado: `npx eas-cli@latest env:list --environment preview`.

## 4. Gerar o APK

Na pasta `mobile`:

```
npm run build:apk
```

Na primeira vez, o EAS pergunta se pode criar a chave de assinatura do Android: responda que sim.
Ele guarda essa chave na sua conta. O build roda na nuvem e leva de 10 a 30 minutos (no plano
gratuito pode esperar na fila). Ao final, aparece um link e um QR code para baixar o `.apk`.

## 5. Instalar e testar

1. Abra o link no celular Android e baixe o arquivo
2. Permita a instalação de "fontes desconhecidas" quando o Android pedir
3. Teste com o **Wi-Fi desligado**, usando os dados móveis, para garantir que o aplicativo não
   depende da sua rede: faça login, grave um áudio e salve um registro

## Novas versões

A cada APK novo distribuído, aumente no `mobile/app.json`:

- `android.versionCode`: número inteiro, sempre maior que o anterior (1, 2, 3…)
- `version`: a versão que o usuário vê (1.0.0, 1.0.1…)

Sem aumentar o `versionCode`, o Android não instala a versão nova por cima da antiga. A instalação
também só funciona se o APK for assinado com a mesma chave, por isso use sempre a mesma conta da Expo.

O `android.package` (`com.agrobot.app`) identifica o aplicativo para sempre: depois de publicado na
Play Store, não pode mudar. Se quiser outro nome, troque antes da primeira publicação.

## Play Store

A Play Store não aceita `.apk`, e sim `.aab`. O perfil `production` do `eas.json` já gera esse
formato e usa o ambiente `production` do EAS (cadastre as variáveis do passo 3 também nele):

```
npx eas-cli@latest build --platform android --profile production
```

Para publicar, é preciso uma conta de desenvolvedor no Google Play Console, além de ícone, tela de
abertura e política de privacidade (o aplicativo grava a voz do produtor).
