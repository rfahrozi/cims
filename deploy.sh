#!/bin/bash
# Script to deploy code to the VPS and run it

VPS_USER="root" # Ganti jika tidak pakai root
VPS_HOST="51.158.254.51"
VPS_DIR="/var/www/cims"

echo "=== Deploying CIMS to $VPS_HOST ==="

# 1. Pastikan build berhasil di lokal sebelum dikirim
echo "[1/4] Preparing source code..."
# Buat tarball berisi source code saja, ignore node_modules dsb.
git archive --format=tar.gz -o cims-source.tar.gz HEAD

# 2. Transfer file ke server
echo "[2/4] Transferring files to VPS..."
scp cims-source.tar.gz $VPS_USER@$VPS_HOST:/tmp/
scp docker-compose.prod.yml $VPS_USER@$VPS_HOST:$VPS_DIR/

# 3. Ekstrak dan jalankan di server
echo "[3/4] Building and restarting containers on VPS..."
ssh $VPS_USER@$VPS_HOST << REMOTESCRIPT
  cd $VPS_DIR
  
  # Ekstrak source code menimpa yang lama
  tar -xzf /tmp/cims-source.tar.gz -C $VPS_DIR
  rm /tmp/cims-source.tar.gz
  
  # Build dan jalankan ulang Docker Compose dengan environment file
  echo "Building images..."
  docker compose -f docker-compose.prod.yml --env-file .env.production build
  
  echo "Starting containers..."
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d
  
  echo "Cleaning up old images..."
  docker image prune -f
REMOTESCRIPT

echo "[4/4] Deployment finished! 🚀"
echo "CIMS is now running at https://devapps.pt-kepri.go.id/cims"
