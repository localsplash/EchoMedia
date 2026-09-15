FROM node:22-alpine
ENV TZ=America/Los_Angeles
RUN apk add --no-cache tzdata
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ src/
COPY scripts/write-build-info.mjs scripts/
ARG BUILD_REVISION
ARG SOURCE_DATE_EPOCH
ARG BUILD_DIRTY
RUN npm run build

RUN mkdir -p /media /app && chown -R node:node /media /app
USER node
EXPOSE 8082

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8082/healthz || exit 1

CMD ["node", "src/server.js"]
