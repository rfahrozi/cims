# Migration Readiness

## Keputusan arsitektur

1. Core API dipindahkan dari router `.mjs` custom ke NestJS TypeScript.
2. Fastify dipakai sebagai HTTP adapter.
3. DTO memakai class-validator dan OpenAPI decorators.
4. Domain rule yang tidak bergantung framework ditempatkan di `packages/domain`.
5. React SPA memakai Vite, shadcn/ui, Tailwind CSS v4, dan Radix UI.
6. Kontrak REST tetap memakai prefix `/api/v1`.
7. SQL baseline lama dipertahankan. Repository port memungkinkan PostgreSQL adapter dan in-memory adapter untuk pengujian.
8. Zoom adapter dipindahkan ke service TypeScript terpisah.
9. Endpoint yang belum dimigrasi dapat melalui legacy compatibility proxy dengan feature flag.
10. Tidak ada AI decision-making pada baseline ini.

## Migrated vertical slices

- Health and application metadata
- Development authentication and current-user context
- Hearing list and gate status
- Electronic hearing request
- Judicial determination hard gate
- Schedule proposal, conflict check, and approval
- Zoom provider status
- Compliance summary shell

## Next migration slices

- Official notice and acknowledgment
- Readiness and identity verification
- Virtual session provisioning
- Participant and hearing control
- Incident management
- Appeal decision reading
- Reconciliation and immutable audit storage
