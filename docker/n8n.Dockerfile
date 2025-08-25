# N8n的自定義Dockerfile
FROM n8nio/n8n:latest

# 設置為root用戶以安裝額外套件
USER root

# 安裝額外的Node.js套件（如果需要）
RUN npm install -g \
    axios \
    moment \
    lodash

# 安裝自定義節點（如果有的話）
# RUN npm install n8n-nodes-custom-package

# 創建必要的目錄
RUN mkdir -p /home/node/.n8n/workflows \
    && mkdir -p /home/node/.n8n/credentials \
    && chown -R node:node /home/node/.n8n

# 複製自定義workflows和credentials
COPY n8n/workflows/ /home/node/.n8n/workflows/
COPY n8n/credentials/ /home/node/.n8n/credentials/

# 設置權限
RUN chown -R node:node /home/node/.n8n

# 切換回node用戶
USER node

# 暴露端口
EXPOSE 5678

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5678/healthz || exit 1

# 啟動命令
CMD ["n8n", "start"]