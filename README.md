# AgroBot 2.0

Diário agrícola por voz: o produtor fala a atividade, a IA transcreve e interpreta, e o registro
fica salvo de forma estruturada. Todo o sistema é construído em código (TypeScript), sem N8N.

## Estrutura principal

- docs: documentos de análise, negócio, API, arquitetura e validação
- mobile: aplicativo React Native (Expo)
- backend: API e processamento de voz em Node.js + Express
- api: especificação da API
- scripts: atalhos para instalar e iniciar

A arquitetura completa está em [docs/10-proposta-arquitetura-sem-n8n.md](docs/10-proposta-arquitetura-sem-n8n.md).

## Como rodar

Backend:

1. No SQL Editor do Supabase, executar em ordem os arquivos de `backend/supabase/migrations`
2. Entrar na pasta backend
3. Copiar `.env.example` para `.env` e preencher as chaves
4. Instalar dependências com `npm install`
5. Iniciar com `npm run dev` (API e worker juntos)
6. Rodar os testes com `npm test`

Aplicativo:

1. Entrar na pasta mobile
2. Instalar dependências com `npm install`
3. Iniciar o Expo com `npx expo start`

As rotas ficam em `http://localhost:3333/v1` e exigem o token do Supabase Auth no header `Authorization`.
