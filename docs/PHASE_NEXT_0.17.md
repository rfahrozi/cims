# Next Production Phase after v0.17.0

## Required execution work

1. Jalankan `npm ci`, full framework typecheck, unit test, build, dan container build pada CI resmi.
2. Jalankan migration runner dan PostgreSQL Phase 4 smoke test pada database ephemeral.
3. Terapkan application database role non-owner, RLS grants, rotation, dan PITR.
4. Lakukan OIDC SIT dengan MFA, role, organization, permission, dan hearing-assignment claims nyata.
5. Integrasikan KMS atau HSM untuk field encryption, token pepper, audit key, dan webhook key.
6. Lakukan live Zoom sandbox SIT dan signed webhook test.
7. Lakukan SIT notification gateway dan validasi legal evidence.
8. Lakukan SIT official-system reconciliation dengan mismatch, timeout, retry, dan schema drift.
9. Tambahkan OpenTelemetry collector, SIEM routing, alert rule, and operational dashboard.
10. Jalankan load, soak, chaos, penetration, and disaster-recovery rehearsal.
11. Jalankan pilot UAT lintas instansi menggunakan data nonproduksi yang representatif.

## Production blockers

- full dependency build belum dieksekusi pada environment ini
- migration belum dijalankan pada PostgreSQL nyata pada environment ini
- external integration credentials belum tersedia
- formal legal, security, privacy, infrastructure, and operational sign-off belum tersedia
