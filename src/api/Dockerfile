# Etapa 1: genera el cliente Prisma y compila TypeScript (api + seed)
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json tsconfig.seed.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npm run build

# Etapa 2: solo dependencias de producción (incluye la CLI de Prisma para `migrate deploy`)
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Etapa 3: imagen final, sin root
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json prisma.config.ts docker-entrypoint.sh ./
COPY --chown=node:node prisma ./prisma
USER node
EXPOSE 3000
CMD ["sh", "docker-entrypoint.sh"]
