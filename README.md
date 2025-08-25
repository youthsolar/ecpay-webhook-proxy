# GCP Python & N8n 開發環境

這是一個準備部署到Google Cloud Platform (GCP)的Python和N8n整合開發環境。專案包含了完整的開發、測試和部署配置。

## 專案結構

```
├── python-app/              # Python Flask 應用程式
│   ├── main.py             # 主應用程式文件
│   ├── requirements.txt    # Python依賴
│   └── .env.example       # 環境變數範例
├── n8n/                    # N8n工作流程自動化
│   ├── docker-compose.yml # N8n Docker配置
│   ├── workflows/         # 工作流程文件
│   ├── credentials/       # 憑證文件
│   └── .env.example      # N8n環境變數範例
├── gcp-configs/           # GCP部署配置
│   ├── app.yaml          # App Engine配置
│   ├── cloudbuild.yaml   # Cloud Build配置
│   └── terraform/        # Terraform基礎設施代碼
├── docker/                # Docker相關文件
│   ├── python-app.Dockerfile
│   ├── n8n.Dockerfile
│   ├── nginx.conf
│   └── init-db.sql
├── docker-compose.yml     # 完整開發環境
└── api/                   # 原有的ECPay webhook服務
```

## 功能特色

### Python應用程式
- Flask web框架
- Google Cloud整合 (Logging, Storage, Secret Manager)
- 健康檢查端點
- Webhook處理功能
- 結構化日誌記錄

### N8n工作流程自動化
- 完整的Docker配置
- PostgreSQL資料庫支援
- Redis快取支援
- 自定義工作流程範例
- 與Python應用程式整合

### GCP部署支援
- App Engine部署配置
- Cloud Build CI/CD
- Terraform基礎設施管理
- Cloud Run支援
- 自動擴展配置

## 快速開始

### 1. 本地開發環境設置

```bash
# 複製環境變數文件
cp python-app/.env.example python-app/.env
cp n8n/.env.example n8n/.env

# 編輯環境變數文件，填入實際值
nano python-app/.env
nano n8n/.env

# 啟動完整開發環境
docker-compose up -d

# 查看服務狀態
docker-compose ps
```

### 2. 服務訪問

- **Python應用程式**: http://localhost:8080
- **N8n工作流程**: http://localhost:5678 (admin/admin)
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 3. 健康檢查

```bash
# Python應用程式健康檢查
curl http://localhost:8080/health

# N8n健康檢查
curl http://localhost:5678/healthz
```

## GCP部署

### 準備工作

1. **設置GCP專案**
```bash
# 設置專案ID
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# 啟用必要的API
gcloud services enable appengine.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sql.googleapis.com
```

2. **配置認證**
```bash
# 創建服務帳戶
gcloud iam service-accounts create gcp-deploy-sa

# 授予權限
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:gcp-deploy-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/editor"

# 下載金鑰文件
gcloud iam service-accounts keys create key.json \
    --iam-account=gcp-deploy-sa@$PROJECT_ID.iam.gserviceaccount.com
```

### 使用Terraform部署基礎設施

```bash
cd gcp-configs/terraform

# 複製變數文件
cp terraform.tfvars.example terraform.tfvars

# 編輯變數文件
nano terraform.tfvars

# 初始化Terraform
terraform init

# 查看執行計劃
terraform plan

# 部署基礎設施
terraform apply
```

### 使用Cloud Build部署應用程式

```bash
# 提交到Cloud Build
gcloud builds submit --config=gcp-configs/cloudbuild.yaml .

# 或者設置自動部署
gcloud builds triggers create github \
    --repo-name=your-repo \
    --repo-owner=your-username \
    --branch-pattern="^main$" \
    --build-config=gcp-configs/cloudbuild.yaml
```

### 手動部署Python應用程式到App Engine

```bash
# 複製App Engine配置
cp gcp-configs/app.yaml python-app/

# 部署到App Engine
cd python-app
gcloud app deploy app.yaml
```

## 開發指南

### Python應用程式開發

```bash
# 進入Python應用程式目錄
cd python-app

# 創建虛擬環境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows

# 安裝依賴
pip install -r requirements.txt

# 本地運行
python main.py
```

### N8n工作流程開發

1. 訪問 http://localhost:5678
2. 使用 admin/admin 登入
3. 匯入 `n8n/workflows/` 中的範例工作流程
4. 根據需要修改和擴展工作流程

### 添加新的工作流程

```bash
# 從N8n介面匯出工作流程
# 將JSON文件保存到 n8n/workflows/ 目錄
# 重新構建Docker映像
docker-compose build n8n
docker-compose up -d n8n
```

## 監控和日誌

### 本地監控

```bash
# 查看所有服務日誌
docker-compose logs -f

# 查看特定服務日誌
docker-compose logs -f python-app
docker-compose logs -f n8n
```

### GCP監控

- **Cloud Logging**: 查看應用程式日誌
- **Cloud Monitoring**: 監控應用程式效能
- **Error Reporting**: 錯誤追蹤和報告

## 故障排除

### 常見問題

1. **資料庫連接失敗**
   - 檢查PostgreSQL容器是否正常運行
   - 驗證資料庫憑證是否正確

2. **N8n無法啟動**
   - 檢查資料庫是否已初始化
   - 驗證環境變數配置

3. **GCP部署失敗**
   - 檢查專案權限設置
   - 驗證服務帳戶金鑰

### 日誌查看

```bash
# Docker容器日誌
docker logs python-app
docker logs n8n
docker logs postgres

# GCP日誌
gcloud logs read "resource.type=gae_app"
gcloud logs read "resource.type=cloud_run_revision"
```

## 安全考量

1. **環境變數**: 使用GCP Secret Manager管理敏感資訊
2. **網路安全**: 配置VPC和防火牆規則
3. **認證**: 使用IAM和服務帳戶進行訪問控制
4. **HTTPS**: 在生產環境中啟用SSL/TLS

## 貢獻指南

1. Fork此專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟Pull Request

## 授權

此專案採用MIT授權 - 詳見 [LICENSE](LICENSE) 文件

## 支援

如有問題或需要支援，請：
1. 查看[故障排除](#故障排除)部分
2. 搜索現有的Issues
3. 創建新的Issue並提供詳細資訊

---

**注意**: 在生產環境部署前，請確保：
- 更新所有預設密碼
- 配置適當的安全群組和防火牆規則
- 設置監控和警報
- 進行完整的安全審查