# Resume Trades Dispatch

Read this first in a new chat. Then read `docs/CONVERSATION.md` (the Grok / IT Helper session) and the rest of this folder.

## Start the new chat on the PC

1. Leave `agent worker start --name "trades-pc"` running on the Windows PC, in `C:\Users\Jimmy\source\trades`.
2. Open https://cursor.com/agents.
3. In the environment dropdown, select `trades-pc` under My Machines.
4. Use the repo https://github.com/jfoley970/trades.
5. Pull `main`. Tell the new agent to read `docs/cursor-handoff/resume.md` before doing anything.

The new chat’s commands run on the PC, which can reach the VM. The planning loop still sits in Cursor’s cloud. That is as local as Cursor’s My Machines setup gets.

## Do not

- Expose the stack to the public internet. `/livekit/token` has no login.
- Work on video chat until James asks. LiveKit is stopped on purpose.
- Run `docker compose up -d` with no service names. That starts LiveKit.
- Provision a new VM. Stay on `claudesandbox`.
- Use a Cursor cloud VM for the repo, Docker, or LAN checks.

## Live beta

http://10.225.30.31/api/health

Host `claudesandbox`, directory `~/trades-dispatch`. Restart:

```bash
cd ~/trades-dispatch
docker compose up -d postgres redis api worker caddy
```

Full status: `live-beta.md` in this folder. Product picture: `project-context.md`.
