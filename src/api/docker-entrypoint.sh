#!/bin/sh
# Arranque de api (spec §10, D-02): migraciones → seed → servidor.
set -e

echo '{"msg":"aplicando migraciones"}'
node node_modules/prisma/build/index.js migrate deploy

echo '{"msg":"aplicando seed"}'
node dist/seed/prisma/seed.js

echo '{"msg":"iniciando api"}'
exec node dist/main.js
