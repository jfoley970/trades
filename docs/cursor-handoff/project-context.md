# Trades Dispatch

On-prem dispatch for licensed trades, for James Foley (Advanced Settings LLC). A homeowner requests a small house call; a licensed plumber, electrician, or HVAC tech diagnoses over video; the platform then sends one verified tech at a time. Launch target is Eagle County and the I-70 corridor. Planned domain: advancedsettings.cloud.

Repo: [jfoley970/trades](https://github.com/jfoley970/trades) at `C:\Users\Jimmy\source\trades` on trades-pc. Read `AGENTS.md`, then `docs/CONVERSATION.md`, `ARCHITECTURE.md`, and `DEPLOY.md`.

## Where it stands

Phase 0 is a Docker Compose skeleton on `main`, clean and even with origin. API is Fastify + TypeScript in `apps/api` (`GET /health`, unauthenticated `POST /livekit/token`). `apps/api/src/worker.ts` is a Redis heartbeat. Postgres/PostGIS 16, Redis 7, LiveKit, and Caddy are in the default stack. Admin, coturn, and MinIO are behind the `later` profile. `apps/mobile` and `apps/admin` are not in the repo.

Live beta is up on claudesandbox, LAN only. Details: [live beta](/cursor/stores/bc-f305ac40-a2ff-4fed-80a1-c2f241bcc754/docs/live-beta.md). Use http://10.225.30.31/api/health. `~/trades-dispatch` is a clone of `main` at `df56c4e`. LiveKit is stopped. Restart with `docker compose up -d postgres redis api worker caddy` so LiveKit stays off.

Recent commits (19 Oct 2026):

- `4bb519d` Phase 0: architecture plan, LAN compose stack, Fastify API
- `df56c4e` Add project conversation log and agent notes for Cursor

## Constraints

- Run repo, Docker, and LAN work on trades-pc (the Windows PC). This chat’s own shell is in Cursor’s cloud and cannot reach `10.225.30.31`. Added 2026-10-19.
- Do not expose the stack publicly. `/livekit/token` has no login.
- LiveKit image is unpinned (`latest`). No real two-person call yet.
- `ARCHITECTURE.md` and `DEPLOY.md` still describe a new Ubuntu 24.04 VM. The conversation decided to stay on the existing sandbox VM (`claudesandbox`, `10.225.30.31`, `~/trades-dispatch`). Do not change that host without James’s OK.
- `~/trades-dispatch` is a git clone of `main`. A bare `docker compose up -d` would start LiveKit again.

## Next steps already suggested

- Add login on the API and protect `/livekit/token`
- Video chat later, including a two-person LAN test
- Start the Expo app and the Next.js admin

## Open questions only James can answer

Public IP/NAT, upload speed, launch region, iOS vs Android, who does triage, pricing, pilot shops, recording, legal entity, hosted maps, Tailscale.
