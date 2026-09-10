# slim y no alpine: el motor de migraciones de Prisma es donde musl y OpenSSL
# suelen romper, y `migrate deploy` es el paso del que depende todo el arranque.
FROM node:22-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
# Obligatorio: `src/generated` está gitignoreado, así que un clone limpio no
# trae el cliente de Prisma y sin esto el proceso muere al importar `db/prisma`.
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 4000

ENTRYPOINT ["./docker-entrypoint.sh"]
