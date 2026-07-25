# Mock Video Provider

Runnable tanpa dependency eksternal.

```bash
MOCK_PROVIDER_PORT=4100 node src/server.mjs
```

Admin scenario:

```bash
curl -X POST http://localhost:4100/admin/scenario -H 'content-type: application/json' -d '{"health":"DOWN"}'
```

Jika `CIMS_WEBHOOK_URL` diset, mock mengirim signed webhook menggunakan HMAC SHA-256 dengan `MOCK_PROVIDER_WEBHOOK_SECRET`.
