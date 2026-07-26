#!/usr/bin/env bash
# =============================================================================
# CIMS — Setup Preproduction Secrets (Local Docker)
# =============================================================================
# Penggunaan:
#   bash scripts/setup-preproduction.sh
#
# Script ini menghasilkan semua secret file yang dibutuhkan untuk menjalankan
# docker-compose.preproduction.yml di lokal.
#
# ⚠️  HANYA untuk preproduction lokal — JANGAN gunakan di production.
# =============================================================================

set -euo pipefail

SECRETS_DIR="$(cd "$(dirname "$0")/../infra/secrets" && pwd)"
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║   CIMS Preproduction — Setup Secrets Lokal           ║"
echo "║   Sistem Koordinasi Persidangan Elektronik           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}⚠️  File secrets akan dibuat di: ${SECRETS_DIR}${NC}"
echo -e "${YELLOW}⚠️  HANYA untuk preproduction lokal — JANGAN gunakan di production${NC}"
echo ""

# Pastikan direktori ada
mkdir -p "$SECRETS_DIR"

# Helper: generate random hex string
rand_hex() {
  local len="${1:-32}"
  # Coba openssl, fallback ke /dev/urandom
  if command -v openssl &>/dev/null; then
    openssl rand -hex "$len" 2>/dev/null || cat /dev/urandom | tr -dc 'a-f0-9' | head -c $((len * 2))
  else
    cat /dev/urandom | tr -dc 'a-f0-9' | head -c $((len * 2))
  fi
}

# Helper: generate base64 string (untuk field encryption key — 32 byte)
rand_b64() {
  local len="${1:-32}"
  if command -v openssl &>/dev/null; then
    openssl rand -base64 "$len" 2>/dev/null | tr -d '\n' || cat /dev/urandom | head -c "$len" | base64 | tr -d '\n='
  else
    cat /dev/urandom | head -c "$len" | base64 | tr -d '\n='
  fi
}

# Helper: tulis secret jika belum ada
write_secret() {
  local file="$SECRETS_DIR/$1"
  local value="$2"
  local label="$3"
  if [[ -f "$file" ]]; then
    echo -e "  ${YELLOW}↷  Sudah ada — dilewati:${NC} $1"
  else
    echo "$value" > "$file"
    echo -e "  ${GREEN}✔  Dibuat:${NC} $1  ${CYAN}($label)${NC}"
  fi
}

echo "📁 Membuat secret files..."
echo ""

# ── PostgreSQL ──────────────────────────────────────────────────────────────
PG_PASSWORD="cims_preproduction_$(rand_hex 8)"
write_secret "postgres_password.txt" \
  "$PG_PASSWORD" \
  "Password PostgreSQL preproduction"

write_secret "database_url.txt" \
  "postgresql://cims:${PG_PASSWORD}@postgres:5432/cims?sslmode=disable" \
  "Connection string PostgreSQL"

# ── API / Worker secrets ─────────────────────────────────────────────────────
write_secret "token_pepper.txt" \
  "preproduction-token-pepper-$(rand_hex 16)" \
  "HMAC pepper untuk join token peserta"

write_secret "field_encryption_key.txt" \
  "$(rand_b64 32)" \
  "AES-256-GCM key untuk enkripsi field sensitif"

write_secret "audit_hash_key.txt" \
  "preproduction-audit-hmac-key-$(rand_hex 16)" \
  "HMAC key untuk chain audit trail"

write_secret "webhook_shared_secret.txt" \
  "preproduction-webhook-secret-$(rand_hex 16)" \
  "Shared secret verifikasi webhook video provider"

# ── Gateway API keys (MOCK mode — nilai dummy) ───────────────────────────────
write_secret "notification_gateway_api_key.txt" \
  "mock-notification-gateway-key-preproduction" \
  "API key gateway notifikasi (MOCK mode)"

write_secret "official_system_gateway_api_key.txt" \
  "mock-official-system-gateway-key-preproduction" \
  "API key integrasi sistem resmi (MOCK mode)"

write_secret "evidence_storage_api_key.txt" \
  "mock-evidence-storage-key-preproduction" \
  "API key object storage bukti (LOCAL mode)"

# ── Zoom Provider (dummy — bisa diganti nilai nyata jika tersedia) ───────────
write_secret "zoom_account_id.txt" \
  "${ZOOM_ACCOUNT_ID:-dummy-zoom-account-id-preproduction}" \
  "Zoom Server-to-Server OAuth account ID"

write_secret "zoom_client_id.txt" \
  "${ZOOM_CLIENT_ID:-dummy-zoom-client-id-preproduction}" \
  "Zoom OAuth client ID"

write_secret "zoom_client_secret.txt" \
  "${ZOOM_CLIENT_SECRET:-dummy-zoom-client-secret-preproduction}" \
  "Zoom OAuth client secret"

write_secret "zoom_host_user_id.txt" \
  "${ZOOM_HOST_USER_ID:-dummy-zoom-host-user-preproduction}" \
  "Zoom host user email atau ID"

# ── Brevo Notification (email) + WhatsApp (stub) ─────────────────────────────
# Isi BREVO_API_KEY dengan API key dari https://app.brevo.com/settings/keys/api
# Jika kosong/dummy, email akan di-stub (tidak dikirim, hanya dicatat di log)
write_secret "brevo_api_key.txt" \
  "${BREVO_API_KEY:-PLACEHOLDER_BREVO_API_KEY_ISI_DENGAN_KEY_NYATA}" \
  "Brevo API key untuk pengiriman email transaksional"

# WhatsApp API key — stub mode aktif, isi saat provider siap
write_secret "whatsapp_api_key.txt" \
  "${WHATSAPP_API_KEY:-stub-whatsapp-api-key-preproduction}" \
  "WhatsApp API key (STUB mode — belum aktif)"

# ── S3 Object Storage (MinIO) ────────────────────────────────────────────────
write_secret "s3_access_key.txt" \
  "cims-admin-$(rand_hex 4)" \
  "Access Key untuk MinIO S3 Object Storage"

write_secret "s3_secret_key.txt" \
  "$(rand_hex 16)" \
  "Secret Key untuk MinIO S3 Object Storage"

echo ""
echo -e "${GREEN}✅ Setup secrets selesai!${NC}"
echo ""
echo "📋 File yang dibuat:"
ls -la "$SECRETS_DIR" | grep -v '^total' | grep -v '^d' | awk '{print "   " $NF}' || true
echo ""
echo -e "${CYAN}Langkah selanjutnya:${NC}"
echo "  1. npm ci"
echo "  2. npm run build"
echo "  3. docker compose -f infra/docker-compose.preproduction.yml build"
echo "  4. docker compose -f infra/docker-compose.preproduction.yml up -d"
echo "  5. docker compose -f infra/docker-compose.preproduction.yml exec api node tools/migrate-postgres.mjs"
echo ""
echo -e "${YELLOW}💡 Tip: Untuk email nyata via Brevo, set BREVO_API_KEY sebelum menjalankan script:${NC}"
echo "   BREVO_API_KEY=xkeysib-xxx... bash scripts/setup-preproduction.sh"
echo ""
echo -e "${YELLOW}💡 Tip: Jika memiliki kredensial Zoom nyata, set env var sebelum menjalankan script:${NC}"
echo "   ZOOM_ACCOUNT_ID=xxx ZOOM_CLIENT_ID=yyy ZOOM_CLIENT_SECRET=zzz ZOOM_HOST_USER_ID=uuu \\"
echo "   bash scripts/setup-preproduction.sh"
echo ""
