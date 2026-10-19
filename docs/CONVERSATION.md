# Project conversation log: trades dispatch app

Conversation between James Foley (Advanced Settings LLC) and his IT Helper assistant, Oct 18, 2026 (Mountain time). It's condensed but in order, so Cursor (or anyone) can pick up where we left off. Secrets are never recorded here.

## 1. Market research (2:48 PM)
**James:** Research apps that are "like Uber" for plumbing, heating, and HVAC, dispatching licensed plumbers and electricians to small house calls.

**Findings:**
- **Puls** (puls.com) is the only real US on-demand dispatch for trades. It books same day or next day, charges an $89 diagnostic fee on some jobs, covers 1,213 areas in 25 states including Denver, and Eagle County coverage is unconfirmed.
- **Close but not dispatch:**
  - Angi Services (formerly Handy) does fixed-price booking, mostly handyman work.
  - Neighborly is an app across franchises: Mr. Rooter, Aire Serv, Mr. Electric. In Colorado they're mostly on the Front Range, and Mr. Electric reaches Vail about once a week.
  - Frontdoor diagnoses by video chat, then refers a pro.
- **Lead marketplaces:**
  - Thumbtack charges pros about $10–100+ per lead and checks license numbers.
  - Angi Leads (formerly HomeAdvisor) charges about $15–85 per shared lead; FTC settlement in 2023.
  - TaskRabbit doesn't verify licenses.
- **Warranty plans:** AHS, Choice, and HomeServe, at about $100–125 per visit.
- **Failed attempts and lessons:**
  - A Ukrainian "Uber for plumbers" spent $300k and earned $2k. Fast arrival mattered for only about 10% of jobs, good customers already have a plumber, and plumbers quit over commissions.
  - Homejoy and HomeHero shut down over worker-classification problems.
  - Customers and pros skip the platform after the first job.
- **Gap:** licensed-only dispatch in mountain towns, with flat fees, exclusive leads, and video diagnosis before dispatch.

## 2. Product direction (2:53 PM)
**James:** These will be licensed technicians, not handymen. It has to be a mobile app with video calls for diagnosis, it has to work like dispatch, and it should build on the lead-gen marketplace ideas. It'll be built in my home dev cluster, running on-prem on an Ubuntu box.

**Plan:** see `ARCHITECTURE.md`.
- **Mobile:** Expo (React Native) with customer and technician roles.
- **Admin:** Next.js dispatcher console.
- **API:** NestJS planned, but phase 0 uses Fastify + TypeScript.
- **Data and jobs:** Postgres + PostGIS, Redis + BullMQ, Socket.IO.
- **Video:** LiveKit with coturn.
- **Payments and pricing:** Stripe Connect, a flat diagnostic fee plus a flat platform fee, and no % commission.
- **Dispatch:** only techs with a verified license and current insurance are matched, and each job goes to one tech at a time.
- **Licensing:** Colorado DORA lookup for plumbers and electricians. HVAC is licensed locally, so the launch towns still need checking.

## 3. Network and hosting decisions (2:58–3:39 PM)
- Home internet has a **static block of public IPs**, so it can port-forward or 1:1 NAT directly. No VPS relay needed.
- A **wildcard cert** under James's personal DNS.
- **DNS:** James has GoDaddy and Linode. We chose **Linode DNS**: Caddy has a solid caddy-dns/linode plugin for DNS-01, and it makes a later move to a Linode-hosted version easy.
- **Domain:** `advancedsettings.cloud`. Planned hosts are `api.`, `admin.`, `rtc.` (LiveKit) and `turn.` (coturn).
- Build **on-prem first**. Linode hosting is a possible later step.

## 4. Deployment target (5:31–9:41 PM)
- `10.225.30.31` is the Docker sandbox VM: hostname `claudesandbox`, Ubuntu 22.04.5, VMware, 4 vCPU, about 10 GB RAM, about 82 GB free.
  - User `jimmy`, SSH key auth from OFFICE-PC.
  - jimmy is in the docker group. sudo needs a password, so nothing system-level was changed.
- The cluster host network is 10.225.30.0/24, gateway .1.
- **James:** Don't create a new VM. Build a new image and run it on this VM.

## 5. Phase 0 build (9:41–9:55 PM)
The LAN-only stack is running on `claudesandbox` in `~/trades-dispatch`, using `docker compose` with the `docker-compose.lan.yml` override. All 6 containers are healthy:

| Container | Details |
|---|---|
| caddy | custom image `trades-dispatch/caddy-linode:dev`; :80 and :443 with its own internal cert |
| api | `trades-dispatch/api:dev`, Fastify; `GET /api/health`, `POST /api/livekit/token` |
| worker | placeholder Redis heartbeat |
| livekit | v1.13.10, host networking, 7880/7881, UDP 50000–50999 |
| postgres | PostGIS 16-3.4 |
| redis | 7 |

- Secrets were generated on the VM only (`.env`, `secrets/turn_secret`) and are not in git.
- coturn, admin and minio are in a `later` profile.

**Known gaps:**
- `/livekit/token` has no login.
- LiveKit should be pinned to a version.
- No real two-person video call has been tested yet.

**Going public needs:**
- 1:1 NAT from a block IP to .31, using the same IP for outbound traffic.
- Port forwards: TCP 80/443, UDP 443, TCP 7881, UDP 50000–50999, 3478 tcp/udp, 5349 tcp, and UDP 49160–49200.
- Linode A records, plus a restricted token (Domains read/write only).
- Switch to the prod Caddyfile and livekit.yaml.
- DOCKER-USER rules if ufw gets enabled.
- Check upload bandwidth: about 3–4 Mbps per call.

## 6. Source control (9:58–10:03 PM)
- Pushed to https://github.com/jfoley970/trades (`main`), from `C:\Users\Jimmy\source\trades` on OFFICE-PC.
- The commit email is the GitHub noreply address, because GH007 blocked the private one. `.gitattributes` forces LF line endings.
- **James:** Continue the build in Cursor, and keep this conversation in the repo.

## Open questions for James
1. Which public IP from the block, 1:1 NAT or routed, and which edge router? Does it support NAT reflection?
2. What's the upload speed on the line?
3. Launch region: Eagle County only, or the I-70 corridor?
4. iOS and Android at launch, or an Android pilot first?
5. Who does the video diagnosis: the tech who gets dispatched, or a remote pool?
6. Which pricing model, and at what amounts?
7. Are pilot shops lined up? Do they need multi-tech accounts?
8. Record video calls in the MVP?
9. Run this under Advanced Settings LLC or a new entity? Attorney for the terms, privacy policy and recording consent?
10. Is hosted mapping OK for the MVP?
11. Tailscale or WireGuard for admin access?

## Suggested next steps
- Add login to the API (customer and tech) and protect `/livekit/token`.
- Run a two-person video call test on the LAN.
- Make the VM's `~/trades-dispatch` a git clone of this repo, so deploys are `git pull` followed by `docker compose up -d --build`.
- Start the Expo mobile app skeleton in `apps/mobile` and the admin console in `apps/admin`.
