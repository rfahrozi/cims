# Sprint 10-12 Local Verification Runbook

1. Copy `.env.example` to `.env` and replace all development secrets.
2. Start the video-provider mock with `npm run mock:provider`.
3. Start the API with `npm run api`.
4. Start the web UI with `npm run web`.
5. Run `npm run check` and `npm test`.
6. Run `npm run test:performance`, `npm run test:dr`, and `npm run test:uat`.
7. Review the appeal workflow, compliance dashboard, reconciliation evidence, audit-chain result, and security-event evidence.
8. Do not use real identities, case files, or production credentials.
