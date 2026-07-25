# Access Review v0.19

## Objective

The access-review feature periodically confirms that explicit hearing assignments are still required.

## Process

1. Security Officer or Auditor creates a campaign scoped to a hearing or court organization.
2. CIMS snapshots active `hearing_user_assignments`.
3. Every item starts as `PENDING`.
4. A reviewer selects `KEEP` or `REVOKE` with a reason.
5. A user cannot decide their own access.
6. `REVOKE` immediately disables the explicit hearing assignment.
7. The campaign completes when no pending items remain.

Organization-based access remains governed separately through RBAC, ABAC, and PostgreSQL RLS.
