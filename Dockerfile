FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY server.js ./
COPY package.json ./

ENV PORT=3000
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "server.js"]
