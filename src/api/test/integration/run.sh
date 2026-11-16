#!/bin/sh
# Arranque de `api-test` (T06, S-08): base de pruebas limpia → migraciones → seed → suite de integración.
# `migrate reset` borra y recrea solo la base de DATABASE_URL (salalibre_test), nunca la de desarrollo.
set -e

case "$DATABASE_URL" in
  */salalibre_test|*/salalibre_test\?*) ;;
  *)
    echo '{"msg":"DATABASE_URL no apunta a la base de pruebas salalibre_test; se cancela"}'
    exit 1
    ;;
esac

echo '{"msg":"recreando la base de pruebas y aplicando migraciones"}'
node node_modules/prisma/build/index.js migrate reset --force

echo '{"msg":"aplicando seed"}'
node dist/seed/prisma/seed.js

echo '{"msg":"ejecutando pruebas de integración"}'
exec npm run test:int
