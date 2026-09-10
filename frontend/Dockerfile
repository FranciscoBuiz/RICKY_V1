FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Las variables NEXT_PUBLIC_ se hornean en el bundle del navegador: tienen que
# existir en el build, no en el arranque. Si cambia el número hay que reconstruir.
ARG NEXT_PUBLIC_WHATSAPP_NUMBER=""
ENV NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER

RUN npm run build

FROM node:22-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# El output standalone NO incluye `public/` ni `.next/static`: hay que copiarlos
# a mano. Si se olvida, el sitio levanta sin CSS, sin fotos y sin videos, y el
# sintoma parece un problema de estilos.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
