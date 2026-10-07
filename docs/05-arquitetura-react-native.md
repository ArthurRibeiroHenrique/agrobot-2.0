# Arquitetura React Native

Arquitetura do aplicativo. O backend e a visão geral do sistema estão em
[10-proposta-arquitetura-sem-n8n.md](10-proposta-arquitetura-sem-n8n.md).

## Stack recomendada

- React Native com Expo
- TypeScript
- Expo Router
- TanStack Query
- Zustand
- Supabase Auth (login por OTP)
- React Hook Form
- Zod
- NativeWind
- Expo Audio para gravação (substitui o Expo AV, descontinuado)
- Expo FileSystem para arquivos
- Expo SQLite para a fila offline
- Expo SecureStore para o token
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

- Cada gravação recebe um `client_id` (UUID) e é salva no aparelho
- A fila fica no SQLite, para sobreviver ao fechamento do aplicativo
- Quando a conexão volta, os itens são enviados em ordem; o `client_id` impede registros duplicados
