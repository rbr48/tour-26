FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --chown=node:node server.js package.json ./
COPY --chown=node:node server ./server

RUN mkdir -p /app/data && chown node:node /app/data

VOLUME ["/app/data"]
EXPOSE 3000
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health >/dev/null || exit 1

CMD ["node", "server.js"]
