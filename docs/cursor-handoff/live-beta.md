# Trades Dispatch live beta

LAN-only, on the existing sandbox VM. Rechecked from that VM at 2026-10-19 04:37 UTC: http://10.225.30.31/api/health returned 200, status ok. API, Caddy, and the worker had just restarted (uptime about two minutes). Postgres and Redis had been up about 44 minutes. LiveKit still exited.

## Use this

**http://10.225.30.31/api/health** on port **80**.

That is the URL James should build against. Caddy on the VM forwards `/api/*` to the API. HTTPS on port 443 also answers (`https://10.225.30.31/api/health`) using Caddy's internal certificate. The API process itself listens only on `127.0.0.1:3000` on the VM.

Health returned HTTP 200, `"status":"ok"`. Postgres 16.4 with PostGIS 3.4.3 and Redis 7.4.11 both checked ok. The worker heartbeat key is set.

## What is running

Host `claudesandbox` (`10.225.30.31`), directory `~/trades-dispatch`. That directory is now a git clone of https://github.com/jfoley970/trades, branch `main` tracking `origin/main`, at `df56c4e`. `.env` and `secrets/turn_secret` were already there and were kept. No secrets were printed.

| Service | Container | State | Bind |
|---|---|---|---|
| Caddy | trades-dispatch-caddy-1 | healthy | `10.225.30.31:80` and `:443` only |
| API | trades-dispatch-api-1 | healthy | `127.0.0.1:3000` |
| Worker | trades-dispatch-worker-1 | healthy | not published |
| Postgres / PostGIS | trades-dispatch-postgres-1 | healthy | `127.0.0.1:5432` |
| Redis | trades-dispatch-redis-1 | healthy | `127.0.0.1:6379` |

These containers were already up and healthy. The API tree on disk matches `main`, so they were not rebuilt.

Admin, MinIO, and coturn are not running. The `later` profile was not started.

## LiveKit

LiveKit was already running from the previous session. It was stopped so this beta is the API and its data services. The container `trades-dispatch-livekit-1` is still on disk, status `exited`, restart policy `unless-stopped`, so a reboot will not start it. `/health` still reports the LiveKit check as failed (`fetch failed`). That check does not flip the API status; overall status stays `ok`.

`docker compose up -d` with no service names would start LiveKit again, because it is not in the `later` profile. To bring it back on purpose: `docker compose up -d livekit`.

## How to restart

```bash
cd ~/trades-dispatch
docker compose up -d postgres redis api worker caddy
```

`.env` already sets `COMPOSE_FILE=docker-compose.yml:docker-compose.lan.yml`, so that command uses the LAN override. After a `git pull`, add `--build` to the same service list.

Logs: `docker compose logs -f --tail=200 api`.

## .env

Every key from `.env.example` was already present. Existing values were left alone. Three blank keys were filled from the example placeholders: `LINODE_DNS_API_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. The LAN API does not read those. `EXPO_ACCESS_TOKEN` and `SMS_PROVIDER_API_KEY` are still blank. File mode is `600`. Running containers were not recreated for that file edit.

## Left in place

`infra/coturn/certs/.gitkeep` is an empty file on the VM and is not in `main`. It was not deleted. Nothing else in the tree was unrelated.

## Not done

No public DNS, NAT, firewall, or host changes. Ports 80 and 443 are bound to the LAN address, not `0.0.0.0`. The PC checkout at `C:\Users\Jimmy\source\trades` was not modified. No commit and no push. The token route was not called.
