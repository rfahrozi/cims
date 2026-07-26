# Zoom Integration Guide for CIMS v0.13.0

## 1. Integration decision

CIMS retains a provider-neutral contract. The Zoom adapter is a separate service so CIMS does not store OAuth access tokens or depend directly on Zoom-specific response models.

## 2. Zoom Marketplace preparation

1. Use an account dedicated to nonproduction integration testing.
2. Create a Server-to-Server OAuth app.
3. Record Account ID, Client ID, and Client Secret in an approved secret manager.
4. Assign a licensed host user and set `ZOOM_HOST_USER_ID` to that user's ID or email.
5. Enable only meeting read and meeting write scopes needed for meeting creation, registrants, registrant cancellation, and in-meeting recording control.
6. Configure event subscriptions and point them to the adapter's public HTTPS `/webhooks/zoom` endpoint.
7. Store the Zoom webhook Secret Token in `ZOOM_WEBHOOK_SECRET_TOKEN`.

## 3. Security model

- OAuth access tokens are cached in memory only and renewed through the account-credentials grant.
- Zoom returns tokens valid for approximately one hour and does not issue a refresh token for Server-to-Server OAuth.
- The adapter never returns the host `start_url` to ordinary CIMS operations.
- Participant join URLs are encrypted at rest using AES-256-GCM.
- `ZOOM_ADAPTER_DATA_KEY` must be a base64-encoded 32-byte key.
- Zoom webhook validation uses challenge-response. Event verification uses the Secret Token and `x-zm-signature`.
- The adapter signs a second normalized webhook before forwarding it to CIMS.

Generate a development encryption key:

```bash
openssl rand -base64 32
```

## 4. Participant access

CIMS now accepts `contact_email` when a hearing participant is registered. This field is used only by the provider adapter to request a unique Zoom registrant link. It is intentionally omitted from participant-list responses and audit payloads.

A Zoom host must be Licensed for meeting registration APIs. If registration is disabled or the host is not eligible, the adapter returns an explicit provider error and CIMS does not expose a shared meeting URL as a fallback.

## 5. Capability matrix

| Capability                               | Zoom REST adapter                      |
| ---------------------------------------- | -------------------------------------- |
| Create scheduled meeting                 | Automated                              |
| Unique participant link                  | Automated through registrant API       |
| Revoke participant link                  | Automated through registrant status    |
| Waiting Room                             | Enabled at meeting creation            |
| Breakout-room pre-assignment             | Automated before meeting start         |
| Admit from Waiting Room                  | Manual host action                     |
| Move a live participant to breakout room | Manual host action                     |
| Private consultation room move           | Manual host action                     |
| Cloud recording start/stop               | Automated when account settings permit |
| Meeting and participant webhooks         | Automated                              |

## 6. Local contract test

The repository includes a fake Zoom OAuth and REST server. It tests the real adapter mapping without using live credentials.

```bash
npm run test:zoom-adapter
```

## 7. Live sandbox smoke test

1. Copy `.env.zoom.example` to `.env`.
2. Populate secrets through the shell or secret manager.
3. Run CIMS API and the Zoom adapter.
4. Use a synthetic case and synthetic participant email.
5. Provision one meeting.
6. Confirm that a meeting appears in the host's Zoom account.
7. Confirm the unique registrant link is returned only after CIMS single-use token exchange.
8. Validate webhook challenge and meeting start/end event delivery.
9. Revoke the registrant and confirm the link no longer grants access.
10. Delete the synthetic meeting after the test.

## 8. Production blockers

- Independent penetration test
- Public webhook endpoint behind WAF and TLS
- Secret manager and key rotation
- PostgreSQL deployment for CIMS and a production-grade adapter datastore
- Zoom account governance, licensed host pool, and rate-limit capacity plan
- Operational procedure for manual Waiting Room and breakout-room controls
- Legal and process-owner approval of participant email usage
- Formal SIT and UAT with the approved Zoom account
