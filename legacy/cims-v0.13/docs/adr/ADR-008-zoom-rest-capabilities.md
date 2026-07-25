# ADR-008: Zoom REST integration uses capability-aware manual fallback

## Status
Accepted for sandbox integration.

## Decision
CIMS integrates Zoom through a separate provider adapter using Server-to-Server OAuth. The adapter automates meeting provisioning, unique registrant links, revocation, pre-meeting breakout assignment, recording control, and webhooks.

Live Waiting Room admission and live breakout-room movement are not represented as successful automated operations because the Zoom REST API does not expose equivalent general controls. The adapter returns `CAPABILITY_NOT_SUPPORTED` with `manual_action_required=true`.

## Consequences
- CIMS remains truthful about provider state.
- Operators must use the Zoom host client for unsupported live actions.
- A future Zoom Apps SDK or Meeting SDK module may add live room automation without changing the core CIMS contract.
