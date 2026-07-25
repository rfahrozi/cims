
# CIMS Production Architecture v0.16.0

## Status

This phase is a production-hardening baseline, not production approval. It replaces development persona identity with generic OIDC verification, adds RBAC and ABAC policy enforcement, introduces PostgreSQL production schemas and repository adapters, and migrates participant and incident workflows into native TypeScript modules.

## Runtime topology

1. React and shadcn/ui web application is served behind an approved reverse proxy or ingress.
2. NestJS Fastify API runs with at least three replicas and no local session state.
3. PostgreSQL is the transactional source for CIMS coordination data.
4. Zoom provider adapter remains a separate trust boundary with dedicated credentials.
5. Official-system integrations use adapters and outbox-driven delivery, not direct coupling from domain services.
6. Central identity provider issues signed OIDC access tokens with organization, role, permission, and hearing-assignment claims.
7. Central logging, SIEM, metrics, tracing, and alerting receive security and operational telemetry.

## Production invariants

- `AUTH_MODE=DEV` is rejected when `NODE_ENV=production`.
- `DATABASE_URL` is mandatory in production.
- Plaintext participant tokens are returned once and never stored.
- Protected identities require explicit permission and are masked by default.
- Consultation recording is forbidden by database constraint and domain rule.
- Attendance, incident-action, and security-event records are append-only.
- Incident deadlines are computed from the recorded occurrence time.
- High or critical blocking incidents suspend an active hearing.
- Provider credentials and host URLs are excluded from ordinary API responses and structured logs.
- Every state-changing integration uses an idempotency key and transactional outbox.

## Data protection

Sensitive participant and incident fields are designed for envelope encryption. Searchable values use normalized keyed hashes rather than plaintext indexes. Encryption keys, token peppers, audit keys, and Zoom credentials belong in an enterprise secret manager with rotation and access logging.

## PostgreSQL isolation

The production migration enables row-level security for participant and incident data. Each request transaction must set organization IDs, hearing assignments, and system-admin status through `set_config` before querying protected tables. Application authorization remains mandatory because RLS is defense in depth, not the only control.

## Remaining production blockers

- Replace in-memory repositories in the earlier determination, scheduling, notice, readiness, virtual-session, hearing-control, audit, and reconciliation modules with PostgreSQL repositories.
- Complete OIDC claim mapping against the selected identity provider.
- Implement encryption service using the approved KMS or HSM.
- Run schema migration and rollback rehearsal on a production-like PostgreSQL cluster.
- Complete external penetration testing and dependency review.
- Complete Zoom sandbox SIT and official notification gateway SIT.
- Complete operational UAT using nonproduction data across all three institutions.
