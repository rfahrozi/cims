# Production Runbook for Manual Hearing Intake v0.18

## Deployment order

1. Back up the target database and verify restore capability.
2. Apply migrations through the checksum-controlled migration runner.
3. Apply reviewed database roles and grants.
4. Deploy API and web images with `HEARING_IMPORT_ENABLED=false`.
5. Confirm OIDC role mapping for Substitute Clerk and Court Clerk.
6. Run RLS, maker-checker, duplicate, encryption, and concurrency smoke tests.
7. Enable the feature for nonproduction UAT only.

## Required smoke tests

- Substitute Clerk can create a draft for their court.
- Substitute Clerk cannot create a draft for another court.
- Duplicate case and hearing sequence returns HTTP 409.
- Stale row version returns HTTP 409.
- Creator cannot activate their own record.
- Court Clerk can return submitted data with a reason.
- Active intake allows determination creation.
- Draft, submitted, or returned intake blocks determination.
- Newly created hearing appears in the global hearing selector.
- Defendant names are unreadable in raw database storage.
- Revision and audit records cannot be updated or deleted by runtime roles.
- Database import endpoint remains disabled.

## Monitoring

Track:

- intake create, submit, return, activate rate
- duplicate and concurrency rejection rate
- maker-checker rejection rate
- time from draft to activation
- records remaining submitted or returned beyond an agreed service time
- authorization failures by court scope
- database errors and transaction rollback rate

## Rollback

Application rollback may use the previous image while preserving the additive database migration. Do not drop v0.18 tables during an operational incident. Disable the intake route at the gateway or feature-control layer if necessary, retain audit evidence, and complete a reviewed forward fix.

## Future import safety

Do not set `HEARING_IMPORT_ENABLED=true` until the connector, source owner agreement, read-only credentials, network policy, mapping, test evidence, and reviewer workflow are approved.
