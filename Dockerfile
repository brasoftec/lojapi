# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copia código fonte
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Gera o Prisma Client (usando schema de produção PostgreSQL)
RUN cp prisma/schema.prod.prisma prisma/schema.prisma && npx prisma generate

# Compila TypeScript
RUN npm run build

# Remove devDependencies
RUN npm prune --production

# ─── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Instala openssl para o Prisma
RUN apk add --no-cache openssl

# Copia apenas o necessário do builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# Garante que o schema de produção está ativo no container
RUN cp prisma/schema.prod.prisma prisma/schema.prisma
COPY package.json ./

# Cria diretório de uploads
RUN mkdir -p uploads

# Usuário não-root por segurança
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3001

# Roda migrations e inicia o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
  