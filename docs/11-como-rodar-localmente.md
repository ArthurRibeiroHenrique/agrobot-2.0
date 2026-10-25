# Como rodar o AgroBot 2.0 no seu computador

Guia passo a passo para colocar o backend e o aplicativo para funcionar localmente. Os comandos
são para o Windows (PowerShell ou Prompt de Comando).

## 1. O que instalar antes

| Programa | Para quê | Como conferir |
| --- | --- | --- |
| Node.js 22.12 ou mais novo | Roda o backend e o Expo | `node -v` |
| Git | Baixar o projeto | `git --version` |
| Expo Go (no celular) | Abre o aplicativo no celular | Loja de aplicativos |

Você também precisa de contas e chaves de dois serviços:

- **Supabase**: banco de dados, login e armazenamento dos áudios
- **OpenAI**: transcrição e interpretação da fala (a chave gera custo por uso)

O celular e o computador precisam estar na **mesma rede Wi-Fi**.

## 2. Preparar o Supabase (uma vez só)

1. No painel do Supabase, abra o **SQL Editor** > **New query**.
2. Rode, **em ordem**, o conteúdo de cada arquivo da pasta `backend/supabase/migrations`:
   1. `20261005000000_schema_inicial.sql`
   2. `20261007000000_dono_storage_fila.sql`
   3. `20261008000000_propriedades_talhoes_datas.sql`
   4. `20261024000000_assistente_intencao.sql`

   Sempre que aparecer uma migração nova no projeto, rode só a nova.
3. Em **Authentication**, deixe o login por código habilitado. Por e-mail, o modelo
   "Magic Link" precisa conter `{{ .Token }}`, para o código chegar no e-mail.

## 3. Backend

Abra um terminal na raiz do projeto e rode:

```
cd backend
copy .env.example .env
npm install
```

Abra o arquivo `backend/.env` e preencha:

| Variável | Onde pegar |
| --- | --- |
| `OPENAI_API_KEY` | Painel da OpenAI > API keys |
| `SUPABASE_URL` | Supabase > Project Settings > API > Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API > `service_role` (**secreta**, só no backend) |
| `DATABASE_URL` | Supabase > Connect > **Session pooler** (porta 5432). Não use o Transaction pooler (6543) |

As demais variáveis já vêm com um valor padrão que funciona.

Para iniciar:

```
npm run dev
```

Quando funcionar, aparece `AgroBot backend rodando em http://localhost:3333`. Para conferir,
abra <http://localhost:3333/health> no navegador: deve mostrar `"status":"ok"`.

Deixe esse terminal aberto enquanto usa o aplicativo.

> Com `RUN_WORKER=true` (o padrão), o mesmo comando já processa a fila de áudios. Se preferir
> separar, coloque `RUN_WORKER=false` e rode também `npm run dev:worker` em outro terminal.

## 4. Aplicativo (celular)

Abra **outro** terminal na raiz do projeto:

```
cd mobile
copy .env.example .env
npm install
```

Descubra o IP do computador na rede Wi-Fi: rode `ipconfig` e procure **Endereço IPv4** do
adaptador Wi-Fi (algo como `192.168.0.10`).

Preencha o `mobile/.env`:

| Variável | Valor |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | `http://SEU_IP:3333/v1` (por exemplo `http://192.168.0.10:3333/v1`). **Não use `localhost`**: no celular, ele aponta para o próprio celular |
| `EXPO_PUBLIC_SUPABASE_URL` | Mesma URL do Supabase usada no backend |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Project Settings > API > chave `anon` (pública) |

Inicie o Expo:

```
npx expo start
```

Aparece um QR code. Abra o **Expo Go** no celular e escaneie (no iPhone, use a câmera). O
aplicativo abre e pede o login por código.

### Atalhos do projeto

Na pasta `scripts` há dois arquivos para dar duplo clique:

- `instalar-dependencias.bat`: roda `npm install` no aplicativo
- `iniciar-expo.bat`: roda `npx expo start` no aplicativo

Eles servem só para o aplicativo. O backend continua sendo iniciado pelo terminal.

## 5. Ordem do dia a dia

1. Terminal 1: `cd backend` e `npm run dev`
2. Terminal 2: `cd mobile` e `npx expo start`
3. Abrir o Expo Go e escanear o QR code

## 6. Outros comandos úteis

Na pasta `backend`:

| Comando | O que faz |
| --- | --- |
| `npm test` | Roda os testes (não usa OpenAI nem Supabase) |
| `npm run typecheck` | Procura erros de tipos no código |
| `npm run eval` | Mede se a IA interpreta bem as falas e a intenção (usa a OpenAI, gera custo) |
| `npm run eval:assistant` | Mede se o assistente encaminha ao técnico quando deve (usa a OpenAI) |

Na pasta `mobile`:

| Comando | O que faz |
| --- | --- |
| `npm run typecheck` | Procura erros de tipos no código |
| `npx expo start -c` | Inicia o Expo limpando o cache |

## 7. Problemas comuns

**O aplicativo diz "Sem conexão com o servidor".**
- Confira se o backend está rodando e se o `/health` abre no navegador do computador.
- Confira se o `EXPO_PUBLIC_API_URL` usa o IP do computador, e não `localhost`.
- Teste no navegador do celular: `http://SEU_IP:3333/health`. Se não abrir, o Firewall do Windows
  pode estar bloqueando a porta 3333: libere o Node.js quando o Windows perguntar, ou crie uma
  regra de entrada para a porta 3333.
- Celular e computador precisam estar na mesma rede. Redes de visitantes ou de faculdade às vezes
  bloqueiam a comunicação entre aparelhos.

**Mudei o `.env` do aplicativo e nada mudou.**
Pare o Expo (Ctrl+C) e rode `npx expo start -c`. As variáveis só são lidas na inicialização.

**Mudei o `.env` do backend e nada mudou.**
Pare (Ctrl+C) e rode `npm run dev` de novo.

**O backend fecha ao iniciar com erro de variável obrigatória.**
Alguma chave do `backend/.env` está vazia ou ainda com o texto `COLE_...`.

**O backend não conecta na fila.**
Confira se a `DATABASE_URL` usa o Session pooler (porta 5432), com a senha do banco no lugar de
`SUA_SENHA`.

**O código de login não chega.**
Veja a configuração do envio de e-mail ou SMS em Authentication no Supabase. O limite do envio
gratuito de e-mails é baixo; se pedir muitos códigos seguidos, aguarde um pouco.

**Erro ao salvar pergunta ou ao enviar uma gravação, citando coluna ou tabela inexistente.**
Falta rodar alguma migração do passo 2.

**O Expo Go não abre o projeto.**
O Expo Go precisa ser compatível com a versão do Expo do projeto (SDK 58). Atualize o aplicativo
na loja. Se ainda assim não abrir, será preciso gerar um build de desenvolvimento.

**Enviar um áudio já gravado não abre o seletor de arquivos.**
Se você usa um build próprio (e não o Expo Go), gere o build de novo: o seletor de arquivos é um
módulo nativo adicionado depois.
