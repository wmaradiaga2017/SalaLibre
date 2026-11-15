import { defineConfig } from 'prisma/config';

// DATABASE_URL la define docker-compose.yml con valores por defecto; `prisma generate` no la necesita.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
