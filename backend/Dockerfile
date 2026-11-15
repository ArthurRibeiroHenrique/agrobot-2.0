FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3333
# A imagem não tem curl nem wget, por isso a verificação usa o próprio Node.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3333) + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
# Roda o node direto, e não pelo npm, para receber o SIGTERM e encerrar a fila com calma.
CMD ["node", "dist/server.js"]
