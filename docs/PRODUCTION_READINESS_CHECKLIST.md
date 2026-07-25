
# Production Readiness Checklist

## Governance and legal
- [ ] SOP, BPMN, BRD, ERD, SRS, API contract, and release scope are approved.
- [ ] Data controller, processor, retention, deletion, and incident roles are formally assigned.
- [ ] The official record boundary between CIMS and official case systems is approved.
- [ ] Production change and emergency change authority are documented.

## Identity and access
- [ ] OIDC issuer and audience are production values.
- [ ] Role, permission, organization, and hearing-assignment claims are verified.
- [ ] MFA is enforced by the identity provider.
- [ ] Break-glass access is time-limited, approved, logged, and reviewed.
- [ ] Quarterly access certification is scheduled.

## Data and database
- [ ] All workflow modules use PostgreSQL repositories.
- [ ] Encryption keys use KMS or HSM and are rotated.
- [ ] RLS context tests cover cross-organization access.
- [ ] Point-in-time recovery is enabled and tested.
- [ ] Backup restoration is rehearsed in an isolated environment.
- [ ] Audit and evidence retention are approved.

## Dependency and build reproducibility
- [ ] A reviewed `package-lock.json` is committed.
- [ ] CI and image builds use `npm ci`.
- [ ] SBOM, provenance, image signature, and dependency audit are attached to the release.

## Application security
- [ ] SAST, dependency scan, secret scan, and container scan pass.
- [ ] External penetration test findings are closed or accepted.
- [ ] Rate limits and request-size limits are load-tested.
- [ ] Webhook signature, replay, and clock-skew tests pass.
- [ ] Protected participant masking negative tests pass.
- [ ] No secrets, tokens, or host URLs appear in logs.

## Reliability and operations
- [ ] SLO and error budget are approved.
- [ ] HPA, PDB, readiness, liveness, and startup probes are verified.
- [ ] Alert routing and 24x7 escalation contacts are tested.
- [ ] Database failover and provider outage scenarios are rehearsed.
- [ ] Runbooks are accessible during a network outage.

## Integrations
- [ ] Zoom sandbox live smoke test passes, including retry and uncertain-operation reconciliation.
- [ ] Manual Zoom capabilities are visible to operators and never represented as automated success.
- [ ] Official notification gateway produces legally acceptable evidence.
- [ ] Official-system reconciliation handles mismatches and retries.
- [ ] Provider API quotas and license capacity are documented.

## Release decision
- [ ] Product Owner approved.
- [ ] Process Owner Pengadilan approved.
- [ ] Process Owner Kejaksaan approved.
- [ ] Process Owner Pemasyarakatan approved.
- [ ] Security, privacy, infrastructure, QA, and authorized officials approved.

## v0.18 Manual Hearing Intake

- [ ] OIDC maps Panitera Pengganti to `SUBSTITUTE_CLERK`.
- [ ] OIDC maps authorized reviewer to `COURT_CLERK`.
- [ ] Maker-checker test proves creator cannot activate the same record.
- [ ] Court organization scope is validated in API and PostgreSQL RLS.
- [ ] Duplicate case plus hearing-sequence constraint is tested.
- [ ] Optimistic concurrency conflict is tested.
- [ ] Defendant names are encrypted at rest and excluded from audit or revision plaintext.
- [ ] Revision history is immutable.
- [ ] `HEARING_DATA` blocks determination until intake status is `ACTIVE`.
- [ ] Global hearing selector displays newly assigned hearings.
- [ ] Future database import flags remain disabled in production.
- [ ] Read-only import design and source-owner approval are completed before enabling import.
