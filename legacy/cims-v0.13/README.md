# Court Intelligence Management System (CIMS)

## Sprint 0-12 working reference implementation

This repository is a runnable development baseline for the approved electronic criminal-hearing workflow. CIMS is a coordination and operational-orchestration layer. It does not replace the official court information system, judicial authority, or legally binding records.

Implemented scope:

1. Sprint 0: configuration, correlation ID, idempotency, append-only audit and local persistence
2. Sprint 1: IAM, password, OTP, signed bearer token, RBAC and hearing assignment scope
3. Sprint 2: electronic hearing request and judicial-determination hard gate
4. Sprint 3: schedule proposal, availability, conflict engine, approval, versioning and one ACTIVE schedule
5. Sprint 4-5: official notice, delivery evidence and acknowledgment
6. Sprint 6: institutional readiness, technical test, identity verification and room inspection
7. Sprint 7: provider-neutral virtual-session provisioning and signed webhooks
8. Sprint 8: participant registry, single-use join token, waiting room, admission, attendance and private consultation
9. Sprint 9: judge-controlled hearing lifecycle, technical incident, cyber incident, force majeure and continuity timers
10. Sprint 10: appellate decision-reading workflow, notice chain, presence, same-day excerpt, seven-day transmission evidence and 14-day cassation deadline
11. Sprint 11: compliance dashboard, official-source reconciliation and tamper-evident audit hash chain
12. Sprint 12: security hardening, performance smoke test, disaster-recovery test and synthetic cross-institution pilot UAT

## Quick start

Requirements: Node.js 22 or newer. No package installation is required.

Terminal 1:

```bash
cp .env.example .env
npm run mock:provider
```

Terminal 2:

```bash
npm run api
```

Terminal 3:

```bash
npm run web
```

Open `http://localhost:4173`.

Verification:

```bash
npm run check
npm test
npm run test:performance
npm run test:dr
npm run test:uat
```

Reset synthetic local data:

```bash
npm run reset:db
```

## Synthetic accounts

| Role | Email | Password | OTP |
|---|---|---|---|
| Administrator | admin@cims.local | Admin123! | 123456 |
| Judge | judge@cims.local | Judge123! | 123456 |
| Court Clerk | clerk@cims.local | Clerk123! | 123456 |
| Prosecutor | prosecutor@cims.local | Prosecutor123! | 123456 |
| Corrections | corrections@cims.local | Corrections123! | 123456 |

Never use these credentials or synthetic data outside development and test environments.

## Release status

- DEV and automated tests: GO
- SIT and synthetic UAT: GO
- Limited nonproduction pilot: CONDITIONAL GO, subject to formal sign-off
- Production and real case data: NO-GO

## Security constraints

- Join-token plaintext is returned once and is never written to audit events.
- Only a token hash and short fingerprint are stored.
- Public token exchange is single-use, time-bound and rate-limited.
- Login and OTP endpoints use rate limiting and temporary account lockout.
- Security response headers are enabled.
- Audit events use a SHA-256 previous-hash chain that can be verified.
- Admission is controlled by an assigned authorized user.
- Hearing lifecycle control requires the assigned judge or System Admin.
- Consultation-room recording is prohibited.
- High or critical incidents may automatically suspend a STARTED runtime, while judicial authority remains with the judge.
- No real case data, production secrets, AI decision-making, biometric recognition or automated legal judgment is included.

## Persistence and test limitations

PostgreSQL remains the canonical production target under `database/migrations`. The runnable build uses Node.js built-in SQLite for deterministic local and CI testing. The included performance and disaster-recovery results are local baseline tests, not production SLA evidence.

## Zoom REST integration candidate v0.13.0

The repository includes a real Zoom REST adapter under `services/zoom-video-provider`. It uses Server-to-Server OAuth and preserves the provider-neutral CIMS contract.

Run the local fake Zoom contract test:

```bash
npm run test:zoom-adapter
```

Prepare a live nonproduction sandbox:

```bash
cp .env.zoom.example .env
# Populate secrets from an approved secret manager.
set -a && . ./.env && set +a
npm run zoom:adapter
```

In a second terminal run CIMS:

```bash
set -a && . ./.env && set +a
npm run api
```

See `docs/ZOOM_INTEGRATION_GUIDE.md` for scope, webhook, security, and capability details.
