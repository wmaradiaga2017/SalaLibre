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

# Etapa de pruebas de integración (T06, S-08): parte de `build` (dependencias de desarrollo y cliente generado) y
# agrega las pruebas. Solo la usa el servicio `api-test` del perfil `test`; la imagen de `api` no la construye.
FROM build AS test
COPY --chown=node:node test ./test
USER node
CMD ["sh", "test/integration/run.sh"]

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
