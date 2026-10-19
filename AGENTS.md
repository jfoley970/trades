# Agent notes

Read `docs/CONVERSATION.md` first. It has the full history and the decisions so far. Then read `ARCHITECTURE.md` for the design and `DEPLOY.md` for the runbook.

**Ground rules from James:**
- Never commit secrets (`.env`, `secrets/`, certs).
- Don't change production systems or anything outside this project's containers on `claudesandbox` (10.225.30.31) without his OK.
- Phase 0 runs LAN-only, using `docker-compose.yml` with the `docker-compose.lan.yml` override.
