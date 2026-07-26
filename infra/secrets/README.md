# CIMS — Secrets Directory

File-file dalam direktori ini **TIDAK** masuk version control (semua di-ignore kecuali file ini).

## Cara Generate Secrets untuk Preproduction Lokal

```bash
bash scripts/setup-preproduction.sh
```

Untuk email nyata via Brevo, sertakan API key:

```bash
BREVO_API_KEY=xkeysib-xxx... bash scripts/setup-preproduction.sh
```

## File yang dibutuhkan

| File                                  | Digunakan oleh             | Keterangan                                                                                                                                                                       |
| ------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `postgres_password.txt`               | PostgreSQL container       | Password database                                                                                                                                                                |
| `database_url.txt`                    | API, Worker, Zoom Provider | Connection string PostgreSQL                                                                                                                                                     |
| `token_pepper.txt`                    | API                        | HMAC pepper untuk join token                                                                                                                                                     |
| `field_encryption_key.txt`            | API, Worker                | AES-256-GCM key (32 byte base64)                                                                                                                                                 |
| `audit_hash_key.txt`                  | API, Worker                | HMAC key untuk audit chain                                                                                                                                                       |
| `webhook_shared_secret.txt`           | API                        | Verifikasi webhook dari video provider                                                                                                                                           |
| `notification_gateway_api_key.txt`    | Worker                     | API key gateway notifikasi (legacy/unused)                                                                                                                                       |
| `official_system_gateway_api_key.txt` | Worker                     | API key integrasi sistem resmi                                                                                                                                                   |
| `evidence_storage_api_key.txt`        | API, Worker                | API key object storage                                                                                                                                                           |
| `zoom_account_id.txt`                 | Zoom Provider              | Zoom Server-to-Server OAuth account ID                                                                                                                                           |
| `zoom_client_id.txt`                  | Zoom Provider              | Zoom OAuth client ID                                                                                                                                                             |
| `zoom_client_secret.txt`              | Zoom Provider              | Zoom OAuth client secret                                                                                                                                                         |
| `zoom_host_user_id.txt`               | Zoom Provider              | Zoom host user email atau ID                                                                                                                                                     |
| `brevo_api_key.txt`                   | Brevo Notification Service | API key Brevo untuk pengiriman email transaksional. Dapatkan dari https://app.brevo.com/settings/keys/api. Jika berisi placeholder, email akan di-stub (log saja, tidak dikirim) |
| `whatsapp_api_key.txt`                | Brevo Notification Service | API key provider WhatsApp (STUB mode — belum aktif). Isi saat provider WhatsApp siap disambung                                                                                   |

## Channels yang Didukung

| Channel    | Status   | Keterangan                                              |
| ---------- | -------- | ------------------------------------------------------- |
| `EMAIL`    | ✅ Aktif | Dikirim via Brevo Transactional Email API               |
| `WHATSAPP` | 🔄 Stub  | Log saja, return DELIVERED — sambung provider nanti     |
| `SMS`      | 🔄 Stub  | Log saja, return DELIVERED — sambung provider nanti     |
| `IN_APP`   | 🔄 Stub  | Log saja, return DELIVERED — notifikasi in-app menyusul |

## ⚠️ Penting

- File ini hanya untuk **preproduction lokal** — JANGAN gunakan nilai yang sama di production
- Untuk production, gunakan secret manager (Vault, AWS Secrets Manager, GCP Secret Manager, dll.)
- Jika tidak memiliki kredensial Zoom nyata, gunakan nilai dummy — fitur video akan menggunakan MOCK mode
- `brevo_api_key.txt` berisi placeholder by default — email tidak akan dikirim sampai diisi API key nyata
