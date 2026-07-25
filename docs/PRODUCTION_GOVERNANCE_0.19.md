# CIMS Production Governance v0.19

## Purpose

Phase 6 adds governance controls that are required before real case data can be used. Manual hearing intake by the Substitute Clerk remains the primary intake path. The future database-import path remains disabled.

## Controls implemented

1. Production readiness assessment with `GO`, `CONDITIONAL_GO`, or `NO_GO`.
2. Legal hold with maker-checker release control.
3. Evidence export with deterministic manifest and SHA-256 hashes.
4. Retention preview without automatic deletion.
5. Periodic access review with `KEEP` and `REVOKE` decisions.
6. Dependency circuit breaker for notification, official-system, video-provider, and evidence-storage adapters.
7. Readiness probe that can return HTTP 503 when a blocking production check fails.

## Mandatory production rules

- `PERSISTENCE_MODE=POSTGRES`
- `AUTH_MODE=OIDC`
- `DB_SSL=true`
- `ENABLE_LEGACY_PROXY=false`
- `EVIDENCE_STORAGE_MODE=HTTP`
- `RETENTION_EXECUTION_ENABLED=false`
- API and outbox worker run as separate processes
- Database import remains disabled until its own approval and security gate

## Production decision

The readiness endpoint is advisory in DEV and SIT. In production, failed blocking checks produce a `NO_GO` decision. The application readiness probe returns HTTP 503 for `NO_GO`.

## Infrastructure guardrails

The production-like deployment templates now include restricted Pod Security labels, resource quota, limit range, default-deny network policy, separated API and worker secrets, and mandatory HTTP evidence storage. These templates remain examples and must be adapted to the approved cluster, secret manager, ingress, certificate, and namespace architecture.
