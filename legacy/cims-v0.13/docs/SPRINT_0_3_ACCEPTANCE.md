# Sprint 0-3 Acceptance Evidence

## Automated verification

The release is accepted for local development and integration testing when all commands pass:

```bash
npm run check
npm test
```

## Covered acceptance scenarios

- Password hashing and verification
- Signed access token validation
- OTP verification and rejection
- Role and permission enforcement
- Hearing assignment scope enforcement
- Judicial determination hard gate
- Required resource-overlap conflict
- Clear conflict result and schedule approval
- One active schedule per hearing
- Gate transition to `NOTICE_AND_READINESS`
- Idempotent replay and key-conflict rejection
- Video provider mock contract smoke test

## Release limitation

This acceptance does not authorize production use. PostgreSQL runtime integration, official identity provider integration, security accreditation, cross-institution UAT, and production operational approval remain outstanding.
