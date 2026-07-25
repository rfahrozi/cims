# CIMS (Criminal Hearing Coordination System) v0.19.0

A production-oriented, high-governance baseline for electronic criminal hearing coordination. 

**Current Phase:** Phase 6 - Production Governance and Evidence
**Production Status:** ⛔ NO-GO (Pending rigorous integration, CI, and security validation)

## System Architecture
- **Backend:** NestJS, Fastify, and TypeScript. Domain rules decoupled from framework dependencies.
- **Frontend:** React, Vite, Tailwind CSS v4, Radix UI, and shadcn/ui.
- **Persistence:** PostgreSQL with Row-Level Security (RLS), optimistic concurrency, and transactional outbox patterns. (Currently utilizing in-memory adapters for several migrated modules pending full DB integration).
- **Integrations:** Provider-neutral video architecture with a Zoom adapter; legacy compatibility proxy for unmigrated legacy endpoints.

## Core Application Workflow (Manual Intake)
Initial hearing data creation is strictly controlled via a manual maker-checker process. Automated database imports are disabled by default.

1. **Drafting:** Substitute Clerk creates a manual draft and completes defendant/organization data.
2. **Submission:** Substitute Clerk submits the draft for review.
3. **Activation:** A distinctly authorized Court Clerk reviews and activates (or returns) the record.
4. **Gating:** The `HEARING_DATA` gate passes only when intake is active.
5. **Progression:** Determination, scheduling, notice, readiness, and virtual-session workflows proceed.

## Production Governance (v0.19 Features)
The platform enforces strict legal and operational guardrails required before handling real case data:
- **Production Readiness Probe:** Advisory in DEV/SIT; returns HTTP 503 in production if blocking checks fail.
- **Data Governance:** Legal hold implementation (maker-checker release), retention preview (automated execution disabled), and periodic access review campaigns (KEEP/REVOKE).
- **Evidence Management:** Deterministic evidence export queues with SHA-256 object hashes and manifests.
- **Resiliency:** Dependency circuit breakers for notification gateways, official systems, video providers, and storage integrations.
- **Infrastructure Constraints:** Requires OIDC authentication, strict DB SSL, HTTP evidence storage, and separate API/worker processes.

## Future Database Import
Automated ingestion is deferred to a future phase. The foundation (source registry, staging tables, feature flags, disabled API gateways) is prepared. When enabled, it will require read-only access, staging, validation, preview, mandatory approval, idempotent commits, and audit reconciliation.

## Validation & Development Commands

**Source Validation:**
```bash
npm run check:phase6
npm run db:migrate:dry-run
npm run release:manifest
```

**Development Environments:**
```bash
cp .env.example .env
npm run dev:api
npm run dev:worker
npm run dev:web
npm run dev:zoom
```

**Framework & PostgreSQL Validation:**
```bash
npm ci
npm run typecheck
npm test
npm run build
export DATABASE_URL='postgresql://cims:cims@localhost:5432/cims_test'
export DB_SSL=false
npm run db:migrate
npm run test:postgres:phase4
npm run test:postgres:phase5
npm run test:postgres:phase6
```

## ⚠️ Production Blockers
Production and real case data remain strictly NO-GO until the following are resolved and formally signed off:
1. Generation and CI-trusted validation of `package-lock.json`.
2. Full NestJS, React, domain, and provider pipeline builds.
3. Execution of PostgreSQL 17 migrations, RLS context tests, and governance smoke tests in CI.
4. Implementation of OIDC role mapping, KMS/HSM secret management, and field-level encryption.
5. Live integration testing with Zoom Sandbox, official notification gateways, and external object storage.
6. Execution of load, soak, penetration, failover, and disaster recovery rehearsal testing.
7. Formal cross-institution UAT approval (Court, Prosecution, Corrections, Security, Auditors).
