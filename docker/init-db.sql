-- 初始化資料庫腳本
-- 創建額外的資料庫和用戶（如果需要）

-- 為Python應用程式創建額外的資料庫
CREATE DATABASE python_app;

-- 創建額外的用戶
CREATE USER python_app WITH ENCRYPTED PASSWORD 'python_app_password';

-- 授予權限
GRANT ALL PRIVILEGES ON DATABASE python_app TO python_app;
GRANT ALL PRIVILEGES ON DATABASE n8n TO python_app;

-- 創建擴展（如果需要）
\c n8n;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c python_app;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";