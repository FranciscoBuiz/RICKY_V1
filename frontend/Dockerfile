FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Las variables NEXT_PUBLIC_ se hornean en el bundle del navegador: tienen que
# existir en el build, no en el arranque. Si cambia el número hay que reconstruir.
ARG NEXT_PUBLIC_WHATSAPP_NUMBER=""
ENV NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER
ARG NEXT_PUBLIC_SENTRY_DSN=""
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT=""
ENV NEXT_PUBLIC_SENTRY_ENVIRONMENT=$NEXT_PUBLIC_SENTRY_ENVIRONMENT

RUN npm run build

FROM node:22-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# El output standalone NO incluye `public/` ni `.next/static`: hay que copiarlos
# a mano. Si se olvida, el sitio levanta sin CSS, sin fotos y sin videos, y el
# sintoma parece un problema de estilos.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Es el unico contenedor que da a internet: no tiene por que correr como root.
# `node:22-slim` ya trae el usuario `node` (uid 1000), y las COPY de arriba le
# dejan `/app` a su nombre porque Next escribe cache adentro de `.next` en
# runtime y como root-owned no podria.
USER node

CMD ["node", "server.js"]
