# Production Runbook v0.19

## Pre-deployment

1. Generate and approve `package-lock.json` in the official repository.
2. Run full workspace build and tests.
3. Apply migrations 0001 through 0005 to an ephemeral PostgreSQL database.
4. Run Phase 4, Phase 5, and Phase 6 PostgreSQL smoke tests.
5. Configure OIDC issuer, audience, JWKS, and role mappings.
6. Configure KMS-backed field encryption and audit keys.
7. Configure HTTP adapters for notification, video provider, and evidence storage.
8. Keep hearing import and retention execution disabled.
9. Verify API and worker separation.
10. Run load, penetration, failover, backup, and restore tests.

## Deployment order

1. Database migration job
2. API deployment
3. Worker deployment
4. Zoom provider deployment
5. Web deployment
6. Readiness validation
7. Synthetic UAT
8. Limited nonproduction pilot

## Rollback

Database migrations are forward-only. Roll back application images only when the previous version is compatible with the migrated schema. Otherwise use a forward-fix migration.

## Incident response

- A `NO_GO` readiness result blocks traffic through the readiness probe.
- Dead-letter outbox events require operational review.
- Open circuits indicate dependency instability and should trigger an alert.
- Evidence-export failures must be retried only after object-store health is restored.
