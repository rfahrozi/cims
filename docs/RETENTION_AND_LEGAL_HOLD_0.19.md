# Retention and Legal Hold v0.19

## Legal hold

Legal holds prevent records from being considered eligible for disposition review. Supported categories are litigation, investigation, audit, court order, and other approved grounds.

The creator of a hold cannot release the same hold when maker-checker control is enabled. Release requires a reason and a second authorized user.

## Retention preview

Phase 6 does not delete or archive records automatically. It only creates an immutable preview with:

- hearing closure date
- selected retention policy
- calculated due date
- active legal-hold count
- eligibility status

Possible statuses are `NOT_CLOSED`, `POLICY_NOT_CONFIGURED`, `ON_HOLD`, `NOT_DUE`, and `DUE_FOR_REVIEW`.

`RETENTION_EXECUTION_ENABLED=true` is forbidden by the production configuration validator until a legally approved disposition workflow is implemented.
