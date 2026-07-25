# CIMS Zoom Video Provider Adapter

This service implements the provider-neutral CIMS video contract using Zoom REST APIs and Server-to-Server OAuth.

## Implemented

- Server-to-Server OAuth token acquisition and one-hour token cache
- Scheduled meeting creation, read, update, and cancellation
- Waiting Room enabled by default
- Registration-enabled unique participant join URLs
- Per-registrant revocation
- Breakout-room pre-assignment before the meeting starts
- Cloud recording start and stop through in-meeting controls
- Zoom webhook URL validation challenge
- `x-zm-signature` verification, replay protection, and normalized event forwarding to CIMS
- AES-256-GCM encryption for join URLs, host start URLs, and meeting passcodes at rest
- Capability reporting and explicit rejection of unsupported live controls

## Important limitation

Zoom REST API does not provide a general endpoint for automated admission from the Waiting Room or moving live participants between breakout rooms. CIMS therefore returns `CAPABILITY_NOT_SUPPORTED` and requires an authorized host to perform the action in the Zoom client. A Zoom Apps SDK or Meeting SDK extension is a separate future track.

## Required Zoom app settings

Create an account-level Server-to-Server OAuth app. For the sandbox integration, enable only the meeting read and meeting write permissions required by the configured endpoints. Configure event subscriptions for meeting start/end, participant join/left, Waiting Room events, breakout-room events, and recording events.

## Run

```bash
cp .env.zoom.example .env
set -a && . ./.env && set +a
npm run zoom:adapter
```

The Zoom webhook endpoint is:

```text
POST /webhooks/zoom
```

The public endpoint must use HTTPS and remain reachable for periodic Zoom validation.
