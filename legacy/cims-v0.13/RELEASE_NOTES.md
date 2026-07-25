# CIMS v0.12.0 Development Release

This release completes the planned Sprint 10-12 development baseline.

## Sprint 10: Appellate decision reading

- versioned appellate decision-reading schedule
- inter-institution notice chain and acknowledgment evidence
- defendant and prosecutor presence records
- open-public-hearing completion state
- 14-day cassation deadline calculation
- same-day decision excerpt publication evidence
- seven-day decision and case-file transmission evidence

## Sprint 11: Audit, compliance and reconciliation

- compliance dashboard across judicial determination, scheduling, notice, readiness, virtual session, hearing control and appellate decision evidence
- official-source reconciliation run with matched, mismatched and missing status
- append-only SHA-256 audit chain with previous-hash verification

## Sprint 12: Security and release verification

- security response headers
- rate limiting for login, OTP and public token exchange
- temporary account lockout after repeated failures
- append-only security-event records
- performance smoke test
- backup and restore verification
- synthetic cross-institution pilot UAT

## Verified results

- repository check: PASS
- unit and integration tests: 20/20 PASS
- provider contract test: PASS
- performance: 400/400 successful, P95 69.76 ms, P99 127.26 ms
- disaster recovery: PASS, data counts and audit chain preserved, local RTO 0.451 seconds
- synthetic pilot UAT: 8/8 PASS

## Classification

This release is for development, system integration testing and synthetic UAT. It is not approved for real case data or production court use.

## 0.13.0 - Zoom REST integration candidate

- Added a production-shaped Zoom provider adapter using Server-to-Server OAuth.
- Added encrypted storage for Zoom join URLs, host URLs, and meeting passcodes.
- Added unique participant access through meeting registration and registrant revocation.
- Added Waiting Room defaults, breakout-room preassignment, recording controls, and signed webhook translation.
- Added webhook URL validation and current `x-zm-signature` verification.
- Added participant `contact_email` as a restricted provider field.
- Added capability reporting and explicit manual-action errors for live admission and live breakout movement not exposed by Zoom REST APIs.
- Added fake Zoom OAuth/API service and automated contract tests.
- This release is not connected to a live Zoom account until approved credentials and webhook endpoints are configured.
