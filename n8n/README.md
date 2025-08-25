# N8n Workflows

This directory contains N8n workflow automation configurations.

## Setup

1. Copy `.env.example` to `.env` and configure your settings
2. Run N8n locally with Docker Compose:
   ```bash
   docker-compose up -d
   ```
3. Access N8n at http://localhost:5678

## Directories

- `workflows/` - Exported N8n workflow files (JSON format)
- `credentials/` - Encrypted credentials storage (do not commit to git)

## Deployment to GCP

For production deployment on GCP, see the deployment guide in `/deployment/gcp/`