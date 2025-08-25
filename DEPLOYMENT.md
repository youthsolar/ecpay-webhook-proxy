# GCP 部署指南

本文檔提供詳細的GCP部署步驟和最佳實踐。

## 部署架構

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   App Engine    │    │   Cloud Run     │    │   Cloud SQL     │
│  (Python App)   │◄──►│     (N8n)       │◄──►│  (PostgreSQL)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Cloud Logging   │    │ Secret Manager  │    │ Cloud Storage   │
│   & Monitoring  │    │   (Credentials) │    │   (Static Files)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 前置準備

### 1. GCP專案設置

```bash
# 設置專案變數
export PROJECT_ID="your-project-id"
export REGION="asia-east1"
export ZONE="asia-east1-a"

# 設置預設專案
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION
gcloud config set compute/zone $ZONE
```

### 2. 啟用必要的API

```bash
# 啟用所有必要的API
gcloud services enable \
    appengine.googleapis.com \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sql.googleapis.com \
    secretmanager.googleapis.com \
    logging.googleapis.com \
    monitoring.googleapis.com \
    storage.googleapis.com \
    cloudresourcemanager.googleapis.com
```

### 3. 創建服務帳戶

```bash
# 創建部署服務帳戶
gcloud iam service-accounts create gcp-deploy-sa \
    --display-name="GCP Deploy Service Account"

# 授予必要權限
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:gcp-deploy-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/editor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:gcp-deploy-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

# 下載服務帳戶金鑰
gcloud iam service-accounts keys create key.json \
    --iam-account=gcp-deploy-sa@$PROJECT_ID.iam.gserviceaccount.com
```

## 部署步驟

### 步驟1: 使用Terraform部署基礎設施

```bash
# 進入Terraform目錄
cd gcp-configs/terraform

# 複製並編輯變數文件
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# 設置Terraform變數
cat > terraform.tfvars << EOF
project_id = "$PROJECT_ID"
region     = "$REGION"
zone       = "$ZONE"
EOF

# 初始化Terraform
terraform init

# 查看執行計劃
terraform plan

# 部署基礎設施
terraform apply -auto-approve

# 獲取輸出值
terraform output
```

### 步驟2: 設置Secret Manager

```bash
# 創建資料庫密碼密鑰
echo -n "your-secure-db-password" | gcloud secrets create db-password --data-file=-

# 創建N8n認證密鑰
echo -n "your-n8n-admin-password" | gcloud secrets create n8n-password --data-file=-

# 創建API金鑰
echo -n "your-api-secret-key" | gcloud secrets create api-secret --data-file=-

# 驗證密鑰創建
gcloud secrets list
```

### 步驟3: 部署Python應用程式到App Engine

```bash
# 回到專案根目錄
cd ../..

# 複製App Engine配置到Python應用程式目錄
cp gcp-configs/app.yaml python-app/

# 更新app.yaml中的環境變數
cat >> python-app/app.yaml << EOF
env_variables:
  GOOGLE_CLOUD_PROJECT: $PROJECT_ID
  DATABASE_URL: postgresql://n8n:password@/n8n?host=/cloudsql/connection-name
  N8N_WEBHOOK_URL: https://n8n-service-hash.a.run.app/webhook
EOF

# 部署到App Engine
cd python-app
gcloud app deploy app.yaml --quiet

# 獲取App Engine URL
gcloud app browse --no-launch-browser
```

### 步驟4: 構建和部署N8n到Cloud Run

```bash
# 回到專案根目錄
cd ..

# 構建N8n Docker映像
gcloud builds submit --tag gcr.io/$PROJECT_ID/n8n:latest -f docker/n8n.Dockerfile .

# 部署到Cloud Run
gcloud run deploy n8n-service \
    --image gcr.io/$PROJECT_ID/n8n:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 5678 \
    --memory 2Gi \
    --cpu 1 \
    --max-instances 3 \
    --set-env-vars N8N_HOST=n8n-service-hash.a.run.app \
    --set-env-vars N8N_PROTOCOL=https \
    --set-env-vars WEBHOOK_URL=https://n8n-service-hash.a.run.app \
    --set-env-vars GENERIC_TIMEZONE=Asia/Taipei \
    --set-env-vars DB_TYPE=postgresdb \
    --set-env-vars DB_POSTGRESDB_HOST=/cloudsql/connection-name \
    --set-env-vars DB_POSTGRESDB_DATABASE=n8n \
    --set-env-vars DB_POSTGRESDB_USER=n8n \
    --add-cloudsql-instances $PROJECT_ID:$REGION:n8n-database

# 獲取Cloud Run URL
gcloud run services describe n8n-service --region $REGION --format 'value(status.url)'
```

### 步驟5: 設置Cloud Build自動部署

```bash
# 連接GitHub倉庫（如果使用GitHub）
gcloud builds triggers create github \
    --repo-name=your-repo-name \
    --repo-owner=your-github-username \
    --branch-pattern="^main$" \
    --build-config=gcp-configs/cloudbuild.yaml

# 或者手動觸發構建
gcloud builds submit --config=gcp-configs/cloudbuild.yaml .
```

## 配置和優化

### 1. 資料庫配置

```bash
# 獲取Cloud SQL連接名稱
export CONNECTION_NAME=$(gcloud sql instances describe n8n-database --format="value(connectionName)")

# 更新應用程式的資料庫連接字串
gcloud app versions describe $(gcloud app versions list --service=default --limit=1 --format="value(id)") \
    --format="value(envVariables)" | grep DATABASE_URL
```

### 2. 網路安全配置

```bash
# 創建VPC網路（可選）
gcloud compute networks create n8n-network --subnet-mode regional

# 創建子網路
gcloud compute networks subnets create n8n-subnet \
    --network n8n-network \
    --range 10.0.0.0/24 \
    --region $REGION

# 配置防火牆規則
gcloud compute firewall-rules create allow-n8n-internal \
    --network n8n-network \
    --allow tcp:5678 \
    --source-ranges 10.0.0.0/24
```

### 3. 監控和警報設置

```bash
# 創建正常運行時間檢查
gcloud monitoring uptime create \
    --display-name="Python App Health Check" \
    --http-check-path="/health" \
    --hostname="your-app-engine-url"

gcloud monitoring uptime create \
    --display-name="N8n Health Check" \
    --http-check-path="/healthz" \
    --hostname="your-cloud-run-url"
```

## 驗證部署

### 1. 健康檢查

```bash
# 檢查Python應用程式
curl https://your-project-id.appspot.com/health

# 檢查N8n服務
curl https://n8n-service-hash.a.run.app/healthz

# 檢查資料庫連接
gcloud sql connect n8n-database --user=n8n
```

### 2. 功能測試

```bash
# 測試webhook端點
curl -X POST https://your-project-id.appspot.com/api/webhook \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}'

# 測試N8n工作流程
curl -X POST https://n8n-service-hash.a.run.app/webhook/test-webhook \
    -H "Content-Type: application/json" \
    -d '{"message": "test"}'
```

### 3. 日誌檢查

```bash
# 查看App Engine日誌
gcloud logs read "resource.type=gae_app" --limit=50

# 查看Cloud Run日誌
gcloud logs read "resource.type=cloud_run_revision resource.labels.service_name=n8n-service" --limit=50

# 查看Cloud SQL日誌
gcloud logs read "resource.type=cloudsql_database" --limit=50
```

## 故障排除

### 常見問題和解決方案

1. **App Engine部署失敗**
```bash
# 檢查配額限制
gcloud compute project-info describe --format="table(quotas.metric,quotas.limit,quotas.usage)"

# 檢查服務帳戶權限
gcloud projects get-iam-policy $PROJECT_ID
```

2. **Cloud Run服務無法啟動**
```bash
# 檢查映像是否存在
gcloud container images list --repository=gcr.io/$PROJECT_ID

# 檢查服務配置
gcloud run services describe n8n-service --region $REGION
```

3. **資料庫連接問題**
```bash
# 檢查Cloud SQL實例狀態
gcloud sql instances describe n8n-database

# 測試連接
gcloud sql connect n8n-database --user=n8n --quiet
```

### 回滾策略

```bash
# App Engine回滾
gcloud app versions list
gcloud app services set-traffic default --splits=PREVIOUS_VERSION=1

# Cloud Run回滾
gcloud run revisions list --service=n8n-service --region=$REGION
gcloud run services update-traffic n8n-service --to-revisions=PREVIOUS_REVISION=100 --region=$REGION
```

## 成本優化

### 1. 資源調整

```bash
# 調整App Engine實例類型
# 編輯 app.yaml 中的 instance_class

# 調整Cloud Run資源
gcloud run services update n8n-service \
    --memory=1Gi \
    --cpu=0.5 \
    --max-instances=2 \
    --region=$REGION
```

### 2. 自動擴展配置

```bash
# 設置App Engine自動擴展
# 在 app.yaml 中配置：
# automatic_scaling:
#   min_instances: 0
#   max_instances: 5
#   target_cpu_utilization: 0.6
```

### 3. 成本監控

```bash
# 設置預算警報
gcloud billing budgets create \
    --billing-account=BILLING_ACCOUNT_ID \
    --display-name="GCP Project Budget" \
    --budget-amount=100USD
```

## 安全最佳實踐

1. **定期輪換密鑰**
2. **使用最小權限原則**
3. **啟用審計日誌**
4. **配置VPC和防火牆**
5. **使用HTTPS和SSL證書**

## 維護和更新

### 定期維護任務

```bash
# 更新依賴套件
pip list --outdated
npm outdated

# 檢查安全漏洞
gcloud container images scan IMAGE_URL

# 備份資料庫
gcloud sql export sql n8n-database gs://your-backup-bucket/backup-$(date +%Y%m%d).sql
```

這個部署指南提供了完整的GCP部署流程。根據您的具體需求，可能需要調整某些配置參數。