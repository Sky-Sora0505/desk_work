# My辞書 — Mac mini（Apple Silicon / arm64）でも Intel でも動く公式 Node イメージ
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data

WORKDIR /app
COPY package.json server.js ./
COPY public ./public

# データ（SQLite）はボリュームに保存。node ユーザー（非root）で動かす
RUN mkdir -p /data && chown -R node:node /data
USER node

EXPOSE 8080
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1

CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
