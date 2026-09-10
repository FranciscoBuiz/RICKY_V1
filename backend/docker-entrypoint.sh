#!/bin/sh
set -e

# Migrar antes de escuchar. Si falla, el contenedor sale y Docker reintenta:
# es preferible a un backend sirviendo contra un esquema viejo.
echo "Aplicando migraciones..."
npx prisma migrate deploy

if [ -n "$BOOTSTRAP_ADMIN_EMAIL" ]; then
  echo "Sembrando usuarios..."
  # Idempotente (upsert con update vacío): correrlo en cada arranque no duplica
  # nada y no pisa cambios hechos desde el panel.
  npx tsx prisma/seed.ts
fi

echo "Levantando Fastify..."
exec npm start
