
# Incident and Disaster Recovery Runbook

## Severity

- SEV-1: active hearing unavailable, confirmed unauthorized access, token or credential exposure, or integrity compromise.
- SEV-2: major degradation, failed official notice chain, or recovery objective at risk.
- SEV-3: limited feature impact with workaround.

## Immediate actions

1. Open a CIMS incident with type, severity, affected hearing, and occurrence time.
2. Suspend the hearing when the incident is blocking.
3. Preserve logs, audit references, provider event IDs, database transaction IDs, and screenshots.
4. Do not copy protected participant data into chat, tickets, or unsecured documents.
5. Notify the designated security and institutional contacts within the applicable deadline.
6. Use the approved fallback or rescheduling path only after the judge or authorized official decides.

## Database recovery

1. Declare the recovery point and record the last verified audit event hash.
2. Restore into an isolated validation environment.
3. Apply migrations in order.
4. Run row counts, foreign-key checks, audit-chain verification, and reconciliation.
5. Record RPO and RTO evidence.
6. Promote only after technical, security, and process-owner approval.

## Zoom or video-provider outage

1. Verify provider health outside the CIMS application.
2. Freeze new provisioning and token issuance.
3. Preserve active participant and attendance state.
4. Follow the approved manual fallback or postpone path.
5. Revoke obsolete participant access after rescheduling.
6. Reissue notices and readiness checks for the new schedule.
