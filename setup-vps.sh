#!/bin/bash
# Script to setup CIMS on VPS without breaking existing apps

echo "=== CIMS VPS Setup Script (Environment & Folders Only) ==="
echo "Target Directory: /var/www/cims"
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

echo "[1/2] Setting up application directory..."
mkdir -p /var/www/cims
mkdir -p /var/www/cims/.data/postgres
chown -R $USER:$USER /var/www/cims

echo "[2/2] Creating .env.production template..."
if [ ! -f /var/www/cims/.env.production ]; then
  cat > /var/www/cims/.env.production << 'ENV_EOF'
# Database
DB_USER=cims_prod_user
DB_PASSWORD=change_this_to_a_secure_password
DB_NAME=cims_prod

# OIDC (Single Sign On)
OIDC_ISSUER=https://sso.pt-kepri.go.id/auth/realms/cims
OIDC_JWKS_URL=https://sso.pt-kepri.go.id/auth/realms/cims/protocol/openid-connect/certs
OIDC_AUDIENCE=cims-api

# Security Keys (Generate strong random strings for these)
WEBHOOK_SHARED_SECRET=generate_strong_secret_1
TOKEN_PEPPER=generate_strong_secret_2
AUDIT_HASH_KEY=generate_strong_secret_3
FIELD_ENCRYPTION_KEY=generate_strong_secret_4

# Integration
OFFICIAL_SYSTEM_GATEWAY_URL=https://internal-api.pt-kepri.go.id/v1
OFFICIAL_SYSTEM_GATEWAY_API_KEY=your_gateway_key

# Notifications
NOTIFICATION_GATEWAY_API_KEY=your_brevo_api_key
BREVO_API_KEY=your_brevo_api_key

# Storage (S3 / MinIO)
S3_ENDPOINT=s3.pt-kepri.go.id
S3_ACCESS_KEY=your_s3_access_key
S3_SECRET_KEY=your_s3_secret_key

# Zoom
ZOOM_ACCOUNT_ID=your_zoom_account_id
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
ZOOM_WEBHOOK_SECRET=your_zoom_webhook_secret
ENV_EOF
  chmod 600 /var/www/cims/.env.production
  echo ".env.production template created!"
else
  echo ".env.production already exists, skipping."
fi

echo "Setup complete! Nginx configuration must be done manually to avoid conflicts."
