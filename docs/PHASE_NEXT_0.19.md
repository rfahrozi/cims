# Phase Next after v0.19

## Runtime validation gate

1. Generate and review the official npm lockfile.
2. Run full NestJS, React, contracts, domain, and Zoom-provider builds.
3. Apply migrations to PostgreSQL 17 in CI.
4. Execute RLS, legal-hold, evidence-export, access-review, and immutable-record smoke tests.
5. Connect a nonproduction OIDC tenant.
6. Connect KMS or HSM-backed secrets.
7. Connect Zoom sandbox, notification sandbox, and evidence object storage.
8. Run load, soak, penetration, failover, backup, and restore tests.
9. Conduct UAT with Substitute Clerks, Court Clerks, Judges, Prosecutors, Corrections, Security, and Auditors.

## Later database-import phase

The database-import feature remains disabled. It starts only after manual intake is stable and includes a read-only source account, staging, mapping, validation, preview, reviewer approval, idempotent commit, and reconciliation.
