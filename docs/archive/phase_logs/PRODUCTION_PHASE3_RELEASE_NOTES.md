# CIMS v0.16.0 Production Hardening Phase 3

## Implemented

- Generic OIDC bearer-token verification for NestJS
- Global authentication guard and permission policy guard
- RBAC plus organization and hearing-assignment ABAC
- Production startup guard that rejects `AUTH_MODE=DEV`
- PostgreSQL connection pool, transaction helper, RLS context, idempotency, and outbox baseline
- AES-256-GCM field encryption service baseline
- Participant registry with protected-identity masking
- Single-use hashed join tokens
- Waiting room, admission, leave, and append-only attendance timeline
- Recording-disabled private consultation workflow
- Technical, cyber, and force-majeure incident management
- Automatic suspension evaluation for blocking incidents
- Cyber notification deadline of 24 hours and force-majeure deadline of 72 hours
- React and shadcn/ui pages for participants, attendance, consultation, and incidents
- Production-like Docker Compose and Kubernetes manifests
- CI production gate and release manifest generation

## Production limitations

Earlier TypeScript workflow modules for determination, scheduling, notice, readiness, virtual session, hearing control, audit, and reconciliation still use the development store. They must be migrated to PostgreSQL before a production release. OIDC, KMS, Zoom, notification gateway, and official-system integrations also require live SIT and formal approval.
