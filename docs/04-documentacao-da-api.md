# Documentacao da API 
 
## Base da API 
 
URL sugerida: https://api.agrobot.app/v1 
 
## Autenticacao 
 
Usar token JWT no header Authorization. 
 
## Endpoints principais 
 
POST /auth/otp/send 
POST /auth/otp/verify 
GET  /farms 
POST /farms 
GET  /fields 
POST /fields 
POST /voice-jobs 
GET  /voice-jobs/id 
POST /voice-jobs/id/confirm 
GET  /activities 
POST /activities 
PATCH /activities/id 
GET  /alerts 
GET  /cooperatives/id/metrics 
POST /cooperatives/id/invites 
 
## Fluxo de voz 
 
1. Aplicativo envia audio para POST /voice-jobs 
2. Backend recebe e salva audio 
3. N8N chama transcricao 
4. N8N chama LLM para extrair dados 
5. Sistema valida dados 
6. Aplicativo recebe rascunho para confirmacao 
7. Usuario confirma ou corrige 
8. Atividade e salva 
