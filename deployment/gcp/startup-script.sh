#!/bin/bash
# Startup script for N8n on Compute Engine

# Update system
apt-get update
apt-get install -y docker.io docker-compose git

# Create n8n user
useradd -m -s /bin/bash n8n
usermod -aG docker n8n

# Clone repository
cd /home/n8n
git clone https://github.com/youthsolar/ecpay-webhook-proxy.git app
cd app/n8n

# Create .env file from instance metadata
echo "N8N_BASIC_AUTH_USER=$(curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/n8n-user)" > .env
echo "N8N_BASIC_AUTH_PASSWORD=$(curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/n8n-password)" >> .env
echo "N8N_HOST=$(curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/n8n-host)" >> .env
echo "N8N_WEBHOOK_URL=$(curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/n8n-webhook-url)" >> .env

# Start N8n
docker-compose up -d

# Setup auto-restart
cat > /etc/systemd/system/n8n.service << EOF
[Unit]
Description=N8n Workflow Automation
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/n8n/app/n8n
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl enable n8n.service
systemctl start n8n.service