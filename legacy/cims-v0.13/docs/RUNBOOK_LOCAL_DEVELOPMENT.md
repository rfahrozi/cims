# Local Development Runbook

## Prerequisite

- Node.js 22 or newer
- Two terminal windows
- No external package installation is required

## Start

```bash
cp .env.example .env
npm run api
```

In another terminal:

```bash
npm run web
```

Open `http://localhost:4173`.

## Verification

```bash
npm run check
npm test
```

## Demo sequence

1. Log in as Judge with `judge@cims.local`, `Judge123!`, OTP `123456`.
2. Record an approved judicial determination.
3. Log out and log in as Court Clerk with `clerk@cims.local`, `Clerk123!`, OTP `123456`.
4. Create a proposal with `ROOM-A` at 09:00 WIB on 12 August 2026 to see a required conflict.
5. Create a new proposal with `ROOM-B` or a non-overlapping time.
6. Check conflicts.
7. Log in as Judge or use the authorized Court Clerk role in the development seed to approve the clear proposal.
8. Inspect gate status and append-only audit events.

## Reset

Stop the API and run:

```bash
npm run reset:db
```

Restart the API to reseed synthetic data.

## Troubleshooting

- Port 4000 busy: set `CIMS_API_PORT`.
- Port 4173 busy: run `node tools/static-server.mjs apps/web/app 4180`.
- Login challenge expired: request a new challenge.
- Schedule returns `DETERMINATION_REQUIRED`: record an effective approved determination first.
- Approval returns `CONFLICT_UNRESOLVED`: create another proposal or resolve the required conflict with an authorized actor and evidence.
