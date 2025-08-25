# Multi-Service Application Platform

這是一個整合了多個服務的應用平台，包含：
- ECPay Webhook 代理服務（部署在 Vercel）
- Python 應用程式（準備部署到 GCP）
- N8n 工作流程自動化（可部署到 GCP 或本地）

## 專案結構

```
.
├── api/                    # ECPay webhook 代理服務（Vercel）
│   └── webhook.js
├── python-app/            # Python 應用程式
│   ├── src/              # 源代碼
│   ├── tests/            # 測試文件
│   ├── config/           # 配置文件
│   └── requirements.txt  # Python 依賴
├── n8n/                   # N8n 工作流程配置
│   ├── workflows/        # 工作流程文件
│   ├── credentials/      # 憑證存儲（不要提交到 Git）
│   └── docker-compose.yml
├── deployment/            # 部署配置
│   ├── docker/          # Docker 配置
│   │   ├── Dockerfile.python
│   │   └── docker-compose.prod.yml
│   └── gcp/             # Google Cloud Platform 配置
│       ├── app.yaml     # App Engine 配置
│       ├── cloudbuild.yaml
│       └── terraform/   # Infrastructure as Code
└── docs/                 # 文檔

```

## 服務說明

### 1. ECPay Webhook 代理服務

部署在 Vercel 上的輕量級服務，用於解決 Zoho Creator 不支援 `application/x-www-form-urlencoded` 格式的問題。

**功能：**
- 接收 ECPay 的 webhook 回調
- 轉換資料格式
- 轉發給 Zoho Creator API

**部署：**
```bash
# 使用 Vercel CLI
vercel --prod
```

### 2. Python 應用程式

基於 Flask 的 API 服務，可以整合各種業務邏輯。

**功能：**
- RESTful API 端點
- 與 N8n 整合
- Google Cloud 服務整合
- 資料處理和分析

**本地開發：**
```bash
cd python-app
pip install -r requirements.txt
python src/app.py
```

### 3. N8n 工作流程自動化

視覺化的工作流程自動化工具，可以連接各種服務。

**本地運行：**
```bash
cd n8n
docker-compose up -d
# 訪問 http://localhost:5678
```

## 部署到 GCP

### 使用 Terraform 自動部署

```bash
cd deployment/gcp/terraform
terraform init
terraform plan -var="project_id=your-gcp-project"
terraform apply
```

### 使用 Cloud Build CI/CD

1. 將代碼推送到 GitHub
2. 在 GCP Console 設置 Cloud Build 觸發器
3. 每次推送會自動構建和部署

### 手動部署

**Python App 到 Cloud Run：**
```bash
gcloud run deploy python-app \
  --source ./python-app \
  --region asia-east1
```

**N8n 到 Compute Engine：**
```bash
# 使用提供的 startup script
gcloud compute instances create n8n-instance \
  --metadata-from-file startup-script=deployment/gcp/startup-script.sh
```

## 開發流程

1. **本地開發：** 在各自的資料夾中開發和測試
2. **版本控制：** 提交到 GitHub
3. **自動部署：** 通過 CI/CD 管道自動部署到相應平台

## 環境變數設置

複製 `.env.example` 文件並重命名為 `.env`：

```bash
cp python-app/.env.example python-app/.env
cp n8n/.env.example n8n/.env
```

## 安全注意事項

- 不要將 `.env` 文件提交到版本控制
- 使用 Google Secret Manager 管理生產環境的敏感資訊
- 定期更新依賴包
- 啟用 HTTPS 和適當的防火牆規則

## 監控和日誌

- Python App: 使用 Google Cloud Logging
- N8n: 內建的執行日誌
- 系統監控: Google Cloud Monitoring

## 技術支援

如有問題，請查看各服務的文檔：
- [Flask Documentation](https://flask.palletsprojects.com/)
- [N8n Documentation](https://docs.n8n.io/)
- [Google Cloud Documentation](https://cloud.google.com/docs)
