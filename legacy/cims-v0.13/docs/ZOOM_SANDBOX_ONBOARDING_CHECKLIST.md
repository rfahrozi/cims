# Zoom Sandbox Onboarding Checklist

## Account and governance

- [ ] A dedicated nonproduction Zoom account or approved sandbox is available.
- [ ] The integration owner and Zoom account administrator are named.
- [ ] A licensed host user is reserved for CIMS integration tests.
- [ ] Meeting creation quota and rate-limit expectations are documented.
- [ ] Participant email processing is approved by the privacy and legal owners.

## Server-to-Server OAuth app

- [ ] Server-to-Server OAuth app is created by an authorized administrator.
- [ ] Account ID, Client ID, and Client Secret are stored in a secret manager.
- [ ] Meeting read and meeting write scopes are limited to required operations.
- [ ] App activation status is confirmed.
- [ ] Credential rotation owner and interval are defined.

## Webhooks

- [ ] Public HTTPS endpoint points to `/webhooks/zoom` on the Zoom adapter.
- [ ] Secret Token is stored in `ZOOM_WEBHOOK_SECRET_TOKEN`.
- [ ] URL validation challenge succeeds.
- [ ] Periodic validation every 72 hours is monitored.
- [ ] Meeting started, ended, participant, Waiting Room, breakout-room, and recording events are enabled as required.
- [ ] Webhook replay and invalid-signature alerts are connected to monitoring.

## CIMS configuration

- [ ] `CIMS_PROVIDER_CODE=ZOOM`.
- [ ] `CIMS_PROVIDER_BASE_URL` points to the adapter.
- [ ] `CIMS_PROVIDER_WEBHOOK_SECRET` matches the adapter.
- [ ] `ZOOM_ADAPTER_DATA_KEY` is a 32-byte base64 key.
- [ ] CIMS and adapter databases are backed up.
- [ ] Logs are confirmed free from OAuth tokens, host URLs, participant join URLs, and meeting passcodes.

## Test gates

- [ ] `npm run check` passes.
- [ ] `npm test` passes.
- [ ] Fake Zoom contract test passes.
- [ ] Live smoke test creates and removes one synthetic meeting.
- [ ] Unique registrant link is issued and revoked.
- [ ] Meeting started and ended webhooks reach CIMS.
- [ ] Manual host procedure for Waiting Room admission is rehearsed.
- [ ] Manual host procedure for live breakout-room movement is rehearsed.
- [ ] Security, QA, and process owners approve the sandbox test report.
