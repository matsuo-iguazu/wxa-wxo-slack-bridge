FROM node:18-slim

# 非rootユーザーの作成
RUN useradd -m -u 1001 appuser

WORKDIR /app

# 依存関係のインストール（package-lock.jsonを使用）
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# アプリケーションコードのコピー
COPY --chown=appuser:appuser . .

# ヘルスチェックの追加
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 非rootユーザーで実行
USER appuser

EXPOSE 3000
CMD ["node", "bridge-server.js"]