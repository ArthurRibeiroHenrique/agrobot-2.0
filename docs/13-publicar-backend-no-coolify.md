# Como publicar o backend no Coolify

Guia para colocar a API e o worker na internet, com HTTPS, sem depender do seu computador. São três
peças:

- **Oracle Always Free:** o servidor (VPS) gratuito, ligado o tempo todo
- **Coolify:** o painel instalado nesse servidor, que baixa o código do GitHub e publica o backend
- **DuckDNS:** o endereço gratuito do backend. Ele continua o mesmo se o servidor for trocado, e assim
  o APK não precisa ser gerado de novo

O código já está pronto: o Coolify usa o `backend/Dockerfile`. A API e o worker rodam juntos em um
único contêiner.

## Antes de começar

- Todas as migrações de `backend/supabase/migrations` aplicadas no Supabase, em ordem
- O código que será publicado já no GitHub, na branch `master`
- Cartão de crédito para o cadastro na Oracle, usado para verificar a identidade

## 1. Criar a conta na Oracle

Crie a conta em https://www.oracle.com/cloud/free/.

A **região inicial (home region) não pode ser trocada depois**, e o plano gratuito só cria servidores
nela. Escolha uma região do Brasil, como `Brazil East (Sao Paulo)`, que fica perto do Supabase e dos
usuários.

## 2. Criar o servidor

Em **Compute > Instances > Create instance**:

| Opção | Valor | Por quê |
| --- | --- | --- |
| Image | Ubuntu 24.04 (a versão para ARM/aarch64) | Sistema mais comum para o Coolify |
| Shape | `VM.Standard.A1.Flex`, com 2 OCPUs e 6 GB | O outro servidor gratuito tem só 1 GB, e o Coolify exige 2 GB |
| Public IPv4 | Ligado | Sem ele, o servidor não fica acessível |
| SSH keys | Baixe a chave privada e guarde em lugar seguro | É o único jeito de entrar no servidor |
| Boot volume | 50 GB | Está dentro do limite gratuito de 200 GB |

**Por que 6 GB, e não os 12 GB gratuitos?** A Oracle pode recuperar um servidor gratuito considerado
ocioso: em 7 dias, CPU, rede e memória abaixo de 20%, as três ao mesmo tempo. O backend passa a maior
parte do tempo parado, então a CPU e a rede tendem a ficar baixas. Com menos memória total, o uso de
memória fica mais facilmente acima de 20%. Isso reduz o risco, mas não é garantia. Confira o uso com
`free -h` e veja a seção [Se o servidor sumir](#se-o-servidor-sumir).

Se aparecer `Out of host capacity`, faltou servidor gratuito naquele momento. Troque o **Availability
Domain**, se houver outro, ou tente de novo mais tarde.

Regras em https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm.

## 3. Abrir as portas

A Oracle bloqueia as portas em **dois lugares**, e é preciso abrir nos dois.

**No painel:** na página do servidor, abra a **Subnet > Security Lists > Default Security List** e, em
**Add Ingress Rules**, cadastre com origem `0.0.0.0/0` e protocolo TCP:

| Porta | Uso |
| --- | --- |
| 80 e 443 | Acesso ao backend e emissão do certificado HTTPS |
| 8000 | Painel do Coolify (será fechada no passo 5) |
| 6001 e 6002 | Atualizações em tempo real e terminal do painel (também serão fechadas no passo 5) |

**No servidor:** entre por SSH e rode os comandos abaixo. O `-I` é necessário porque a regra precisa
ficar antes do bloqueio que já vem na imagem:

```
ssh -i CAMINHO_DA_CHAVE ubuntu@IP_DO_SERVIDOR
sudo iptables -I INPUT 5 -p tcp -m multiport --dports 80,443,8000,6001,6002 -j ACCEPT
sudo netfilter-persistent save
```

## 4. Instalar o Coolify

Ainda no servidor:

```
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Ao terminar, abra `http://IP_DO_SERVIDOR:8000` e **crie a conta de administrador imediatamente, com
senha forte**. Quem chegar primeiro a essa página vira administrador, com acesso total ao servidor.
No assistente inicial, escolha instalar no próprio servidor (**localhost**).

## 5. Criar o endereço e proteger o painel

1. Em https://www.duckdns.org, entre e crie um subdomínio, como `agrobot-api`, apontando para o IP do
   servidor
2. Crie outro, como `agrobot-painel`, também apontando para esse IP
3. No Coolify, em **Settings**, preencha **URL** com `https://agrobot-painel.duckdns.org` e salve
4. Confirme que o painel abre nesse endereço, com HTTPS
5. Na Security List da Oracle, apague as regras das portas 8000, 6001 e 6002

## 6. Publicar o backend

1. Em **Projects**, crie um projeto e clique em **+ New**. Escolha **Private Repository (with GitHub
   App)** e siga os passos para liberar o acesso ao repositório `agrobot-2.0`
2. Preencha:

| Opção | Valor | Por quê |
| --- | --- | --- |
| Branch | `master` | Cada push nessa branch pode publicar uma nova versão |
| Build Pack | `Dockerfile` | Usa o `backend/Dockerfile` |
| Base Directory | `/backend` | O repositório também tem o aplicativo; só o backend vai para o servidor |
| Dockerfile Location | `/Dockerfile` | O caminho é relativo à Base Directory |
| Ports Exposes | `3333` | A porta em que o backend escuta dentro do contêiner |
| Domains | `https://agrobot-api.duckdns.org` | Com `https://`, o Coolify emite o certificado sozinho |
| Watch Paths | `backend/**` | Mudanças só no aplicativo ou na documentação não geram deploy |

3. Em **Environment Variables**, clique em **Developer view** e cole, com os mesmos valores do seu
   `backend/.env`:

```
PORT=3333
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

- `DATABASE_URL` precisa ser a do **Session pooler** (porta 5432), como no ambiente local. A conexão
  direta do Supabase usa IPv6 e o Transaction pooler (6543) não funciona com a fila
- `ALLOWED_ORIGINS` não é necessária: o aplicativo não passa pela verificação de origem, que vale só
  para navegadores
- Essas chaves ficam só no Coolify. Nunca as coloque no aplicativo nem no Git

4. Clique em **Deploy** e acompanhe os logs. O primeiro build pode demorar alguns minutos

## 7. Conferir

1. Abra `https://agrobot-api.duckdns.org/health` no navegador. Deve aparecer `"status":"ok"`, **sem
   aviso de certificado**. O aplicativo não aceita certificado inválido
2. Abra `https://agrobot-api.duckdns.org/v1/activities`. Deve aparecer erro 401: é o esperado, pois a
   rota exige login

## 8. Ligar o aplicativo ao backend

Cadastre o endereço no EAS, com `/v1` no final, e gere o APK seguindo o
[guia do APK](12-gerar-apk.md):

```
npx eas-cli@latest env:create --environment preview --visibility plaintext --name EXPO_PUBLIC_API_URL --value https://agrobot-api.duckdns.org/v1
```

Se a variável já existir, atualize o valor:

```
npx eas-cli@latest env:update --variable-name EXPO_PUBLIC_API_URL --variable-environment preview --value https://agrobot-api.duckdns.org/v1
```

Para usar esse backend também no Expo Go, troque o `EXPO_PUBLIC_API_URL` do `mobile/.env`.

## Novas versões

Com o GitHub App ligado, cada push na `master` que altere a pasta `backend` publica o backend sozinho.
Migrações novas **não** são aplicadas automaticamente: rode-as no SQL Editor do Supabase antes do push.

Trocar o endereço do backend exige gerar um APK novo. Por isso, não apague o subdomínio do DuckDNS.

## Se o servidor sumir

Todos os dados ficam no Supabase, e o código fica no GitHub. O servidor não guarda nada que não possa
ser refeito, mas as variáveis do passo 6 precisam estar guardadas em lugar seguro.

Se a Oracle desligar ou apagar o servidor, tente religá-lo no painel. Se não der, refaça os passos 2,
3, 4 e 6 e aponte os subdomínios do DuckDNS para o novo IP. O APK continua funcionando, sem novo build.

## Problemas comuns

Os erros aparecem na aba **Deployments** (build) e na aba **Logs** (execução) do recurso no Coolify.

| Sintoma | Causa provável |
| --- | --- |
| Painel não abre em `IP:8000` | Porta fechada na Security List ou no `iptables` (passo 3) |
| Aviso de certificado no endereço do backend | Portas 80 ou 443 fechadas, ou DuckDNS apontando para outro IP |
| `ZodError` citando uma variável | Variável faltando ou vazia no passo 6 |
| `Falha ao iniciar o backend`, com erro de conexão ou senha | `DATABASE_URL` errada, ou projeto do Supabase pausado (acontece após cerca de uma semana parado no plano gratuito) |
| Build sem encontrar o `Dockerfile` | Base Directory diferente de `/backend` |
| `Bad Gateway` ou `no available server` | Ports Exposes diferente da `PORT` cadastrada |
| `/health` funciona, mas o áudio fica parado em "processando" | `RUN_WORKER` diferente de `true`, ou erro da OpenAI nos logs (chave ou saldo) |
| Servidor parado do nada | Oracle recuperou por ociosidade: veja [Se o servidor sumir](#se-o-servidor-sumir) |

## Histórico da hospedagem

| Opção | O que aconteceu | Onde ver |
| --- | --- | --- |
| Túnel do ngrok | Testado para acessar o backend pelo APK, com o computador ligado. A rede com Fortinet bloqueou o domínio, e o celular abriu o endereço com a tela em branco. Removido | Commit `4a8832f` |
| Railway | Guia escrito, mas nunca colocado em uso: o plano que atenderia um processo sempre ligado é pago | Commit `4611d00` |
| Coolify na Oracle Always Free | Opção atual, por ser gratuita | Este guia |
