# Deployment Runbook CIMS v0.17.0

## 1. Release gate sebelum deploy

1. `package-lock.json` telah dibuat, ditinjau, dan `npm ci` selesai dari lockfile yang disetujui.
2. `npm run check:phase4` lulus.
3. `npm run typecheck`, `npm test`, dan `npm run build` lulus.
4. Dependency, SAST, secret, container, dan IaC scan tidak mempunyai temuan Critical atau High yang belum diterima.
5. Backup database dan recovery point dikonfirmasi.
6. Change ticket, rollback owner, dan communication owner ditetapkan.

## 2. Build image

```bash
VERSION=$(cat VERSION)
docker build -f apps/api/Dockerfile -t registry.example/cims/api:$VERSION .
docker build -f apps/worker.Dockerfile -t registry.example/cims/worker:$VERSION .
docker build -f apps/web/Dockerfile -t registry.example/cims/web:$VERSION .
docker build -f services/zoom-provider/Dockerfile -t registry.example/cims/zoom-provider:$VERSION .
docker build -f tools/Dockerfile.migrations -t registry.example/cims/migrations:$VERSION .
```

Generate SBOM, sign image, lalu push hanya setelah image scan lulus.

## 3. Database migration

Gunakan user migration terpisah dari user aplikasi.

```bash
export DATABASE_URL='postgresql://migration-user@database/cims'
npm run db:migrate:dry-run
npm run db:migrate
npm run db:migrate:status
```

Migration runner memakai advisory lock dan checksum ledger. Migration yang sudah diterapkan dengan checksum berbeda harus diperlakukan sebagai release blocker. File migration lama tidak boleh diedit.

## 4. Urutan rollout

1. Jalankan migration Job.
2. Verifikasi `schema_migrations` dan PostgreSQL smoke test.
3. Deploy Zoom provider dan verifikasi OAuth health serta durable idempotency.
4. Deploy API dengan `OUTBOX_WORKER_ENABLED=false`.
5. Verifikasi `/health/live`, `/health/ready`, login OIDC, dan read-only workflow.
6. Deploy worker dengan `OUTBOX_WORKER_ENABLED=true`.
7. Verifikasi outbox PENDING turun dan tidak ada DEAD_LETTER baru.
8. Deploy frontend.
9. Aktifkan traffic bertahap melalui canary atau weighted routing.
10. Jalankan synthetic end-to-end hearing nonproduksi.

## 5. Verifikasi pascadeploy

- correlation ID tampil pada response dan log
- user lintas hearing mendapat 403 atau hasil kosong sesuai kebijakan
- determination hard gate menolak jadwal tanpa penetapan
- duplicate active schedule ditolak
- notice delivery menghasilkan attempt dan evidence
- virtual provisioning selesai melalui worker
- provider webhook invalid ditolak
- reconciliation menghasilkan item field-level
- audit chain valid
- outbox DEAD_LETTER bernilai nol

## 6. Rollback

Application rollback dilakukan dengan mengembalikan image API, worker, dan web ke versi sebelumnya. Jangan melakukan down migration otomatis pada tabel yang sudah menerima data. Gunakan forward-fix migration, feature flag, atau compatibility view. Hentikan worker ketika event baru tidak kompatibel dengan versi aplikasi yang dikembalikan.

## 7. Incident stop conditions

Hentikan rollout ketika terjadi:

- audit chain invalid
- data lintas hearing terlihat oleh user yang tidak berwenang
- duplicate active schedule
- notification evidence hilang
- provider secret atau join URL muncul di log
- outbox backlog bertambah terus
- error rate atau latency melewati release threshold
