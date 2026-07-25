# Phase Next after v0.18

## Runtime validation

1. Generate and review `package-lock.json` in the official repository.
2. Run full NestJS, React, shared-contract, and Zoom provider builds.
3. Apply migrations 0001 through 0004 to ephemeral PostgreSQL.
4. Execute Phase 4 and Phase 5 PostgreSQL smoke tests.
5. Verify OIDC role and permission mapping for Substitute Clerk and Court Clerk.
6. Verify field encryption, revision redaction, RLS, and audit immutability.
7. Conduct manual intake UAT with realistic nonproduction cases.

## Future database import implementation

The database connector should only begin after manual intake is stable. The implementation sequence is:

1. Approved read-only source contract
2. Source health and schema adapter
3. Staging and payload hashing
4. Versioned mapping rules
5. Validation and duplicate engine
6. Preview UI
7. Reviewer approval
8. Idempotent commit
9. Reconciliation dashboard
10. Operational and security UAT
