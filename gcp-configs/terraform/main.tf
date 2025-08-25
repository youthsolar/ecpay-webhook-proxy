# Terraform配置用於GCP資源管理
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# 提供者配置
provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# 變數定義
variable "project_id" {
  description = "GCP專案ID"
  type        = string
}

variable "region" {
  description = "GCP區域"
  type        = string
  default     = "asia-east1"
}

variable "zone" {
  description = "GCP可用區"
  type        = string
  default     = "asia-east1-a"
}

# 啟用必要的API
resource "google_project_service" "apis" {
  for_each = toset([
    "appengine.googleapis.com",
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "sql.googleapis.com",
    "secretmanager.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com"
  ])
  
  project = var.project_id
  service = each.value
  
  disable_dependent_services = true
}

# Cloud SQL實例（用於N8n）
resource "google_sql_database_instance" "n8n_db" {
  name             = "n8n-database"
  database_version = "POSTGRES_15"
  region           = var.region
  
  settings {
    tier = "db-f1-micro"
    
    backup_configuration {
      enabled = true
      start_time = "03:00"
    }
    
    ip_configuration {
      ipv4_enabled = true
      authorized_networks {
        value = "0.0.0.0/0"
        name  = "all"
      }
    }
  }
  
  deletion_protection = false
}

# 資料庫
resource "google_sql_database" "n8n_database" {
  name     = "n8n"
  instance = google_sql_database_instance.n8n_db.name
}

# 資料庫用戶
resource "google_sql_user" "n8n_user" {
  name     = "n8n"
  instance = google_sql_database_instance.n8n_db.name
  password = "your-secure-password"  # 在生產環境中使用Secret Manager
}

# Secret Manager密鑰
resource "google_secret_manager_secret" "db_password" {
  secret_id = "n8n-db-password"
  
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = google_sql_user.n8n_user.password
}

# 輸出
output "sql_connection_name" {
  value = google_sql_database_instance.n8n_db.connection_name
}

output "sql_ip_address" {
  value = google_sql_database_instance.n8n_db.ip_address
}