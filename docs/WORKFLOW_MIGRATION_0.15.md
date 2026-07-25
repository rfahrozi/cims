# Workflow Migration Release 0.15.0

## Migrated vertical slices

- Official notice creation, simulated delivery evidence, and acknowledgment
- Identity verification and room inspection
- Readiness submissions for Court, Prosecution, and Corrections
- Provider-neutral virtual session provisioning with five room types
- Judge-controlled hearing lifecycle
- Expanded gate-status and audit endpoints
- React and shadcn/ui workflow pages

## Development personas

The frontend sends `x-cims-dev-persona` in DEV and SIT only. Available values are `court-clerk`, `judge`, `prosecutor`, `corrections`, `it-operator`, and `system-admin`.

## Demo order

1. Record an approved judicial determination.
2. Create, check, and approve a schedule proposal.
3. Create and send an official notice.
4. Switch to Prosecutor and Corrections personas to acknowledge their notices.
5. Submit readiness for Court and Prosecution.
6. As Corrections, record identity verification and room inspection, then submit readiness.
7. As IT Operator or Court Clerk, provision the virtual session.
8. As Judge, start, suspend, resume, and end the hearing.
