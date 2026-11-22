# Arquitetura React Native

Arquitetura do aplicativo. O backend e a visão geral do sistema estão em
[10-proposta-arquitetura-sem-n8n.md](10-proposta-arquitetura-sem-n8n.md).

## Stack em uso

- React Native com Expo (SDK 57)
- TypeScript
- Expo Router
- TanStack Query (dados do servidor e consulta periódica do rascunho)
- Zustand (sessão e fila offline, esta persistida no AsyncStorage)
- Expo Network para saber quando a internet volta
- Supabase Auth (login por código), com a sessão guardada no AsyncStorage
- Expo Audio para gravação (substitui o Expo AV, descontinuado)
- Estilos com `StyleSheet` do React Native

## A acrescentar nas próximas etapas

- Sentry (`@sentry/react-native`) para erros
- PostHog para analytics

## Estrutura de pastas

- src/app: telas e rotas
- src/components: componentes visuais
- src/services: API, Supabase, áudio, analytics
- src/hooks: regras reutilizáveis
- src/store: estado global
- src/lib: validações, constantes e utilitários
- src/types: tipos TypeScript

## Comunicação com o backend

- Todas as chamadas passam por `src/services/api.ts`, que lê a URL de `EXPO_PUBLIC_API_URL`
  e envia o token do Supabase no header `Authorization`
- O envio de áudio usa `multipart/form-data` em POST /voice-jobs
- Após o envio, o aplicativo consulta GET /voice-jobs/:id até o rascunho ficar pronto

## Fila offline

- Ao parar a gravação (ou escolher um áudio), o arquivo é copiado para a pasta de documentos do
  aparelho (`fila-de-gravacoes/<client_id>.<extensão>`), que o sistema não limpa sozinho, e entra
  na fila (`src/store/offlineStore.ts`, persistida no AsyncStorage). Só depois o envio é tentado.
- A fila guarda, para cada gravação, o `client_id`, o dono (`userId`), o momento da gravação
  (`recorded_at`) e o fuso. O servidor usa `recorded_at` para resolver "hoje" e "ontem" pelo dia em
  que o produtor falou, mesmo que o envio aconteça dias depois.
- O envio automático (`src/hooks/useSyncQueue.ts`) roda ao abrir o app, ao voltar para ele, quando o
  Expo Network avisa que a internet voltou e a cada minuto enquanto houver gravação aguardando.
  Os itens vão em ordem de gravação; o `client_id` impede registros duplicados se um envio for
  repetido.
- Estados: `aguardando` (sem sinal, servidor fora, limite de uso ou sessão vencida; tenta de novo),
  `recusada` (o servidor não aceita o áudio, como formato inválido; o produtor descarta) e
  `enviada` (falta conferir o rascunho). Depois de enviado, o áudio local é apagado.
- A tela inicial mostra o que está esperando internet e o que falta conferir. A gravação sai da
  lista quando é salva no diário, quando era só uma pergunta (já respondida), quando falhou no
  processamento ou quando o produtor toca em "Gravar de novo".
- Ao excluir a conta, as gravações da pessoa guardadas no aparelho também são apagadas.
- Foi usado AsyncStorage, e não SQLite, porque a fila é pequena (poucos itens, só metadados; o
  áudio fica em arquivo) e o AsyncStorage já fazia parte do app.
- Ainda não funciona offline: ver o diário, perguntar por texto e conferir rascunhos, que dependem
  do servidor.
