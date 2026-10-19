# DEPLOY.md: App VM build & deploy runbook

Target: a **new Ubuntu 24.04 LTS VM** (`trades-app`) in James's home cluster, next to the existing Docker sandbox VM (hypervisor host `10.225.30.2`). Domain `advancedsettings.cloud`, DNS on Linode, static public IP block. Architecture background: [ARCHITECTURE.md §9](ARCHITECTURE.md#9-on-prem-deployment).

> Placeholders: `APP_PUBLIC_IP`, `APP_LAN_IP`, `TURN_PUBLIC_IP`, `TURN_LAN_IP`, NIC `ens18`, `<ADMIN_SUBNET_OR_VPN>`. Replace them with real values.

---

## 1. Create the VM (any hypervisor)

1. Download the **Ubuntu Server 24.04 LTS** ISO (or the cloud image if your hypervisor supports cloud-init).
2. Create the VM:
   - **4 vCPU / 16 GB RAM / 200 GB** SSD-backed disk to start (grow to 8 vCPU / 32 GB before launch). CPU type "host" (or equivalent) for performance; virtio disk/NIC where available.
   - NIC on the **app VLAN/DMZ** (separate from the home LAN and the hypervisor management network if possible). Optional **second disk** for local backups.
   - Turn on the guest agent option (e.g. qemu-guest-agent on Proxmox, open-vm-tools on ESXi).
3. Install Ubuntu: OpenSSH server **on**, import your SSH key, no extra snaps. Set a **static private IP** (`APP_LAN_IP`) in netplan. If using a second public IP for coturn, add `TURN_LAN_IP` as a secondary address on the same NIC:
   ```yaml
   # /etc/netplan/50-static.yaml (example)
   network:
     version: 2
     ethernets:
       ens18:
         addresses: [APP_LAN_IP/24, TURN_LAN_IP/24]   # drop TURN_LAN_IP if single IP
         routes: [{to: default, via: <GATEWAY>}]
         nameservers: {addresses: [1.1.1.1, 9.9.9.9]}
   ```
   `sudo netplan apply`
4. Base hardening:
   ```bash
   sudo apt update && sudo apt -y full-upgrade
   sudo apt -y install unattended-upgrades fail2ban qemu-guest-agent git curl jq
   sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/; s/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
   sudo systemctl restart ssh
   sudo timedatectl set-timezone America/Denver
   ```
5. Take a hypervisor **snapshot** ("clean-base").

## 2. Edge network + DNS

1. **Edge firewall/router:** 1:1 NAT `APP_PUBLIC_IP` ↔ `APP_LAN_IP` (inbound **and** outbound SNAT), and `TURN_PUBLIC_IP` ↔ `TURN_LAN_IP` if using a second IP. Allow only the ports in ARCHITECTURE.md §9 → "Ports" (80, 443 tcp+udp, 7881/tcp, 50000–50999/udp, 3478 tcp+udp, 5349/tcp, 49160–49200/udp, plus 443/tcp on the TURN IP if used). Enable NAT reflection if you'll test from inside the LAN.
2. **Linode DNS Manager** → zone `advancedsettings.cloud` (registrar NS = `ns1–ns5.linode.com`): A records `api`, `admin`, `rtc` → `APP_PUBLIC_IP`; `turn` → `TURN_PUBLIC_IP`; TTL **300**. Optional CAA `0 issue "letsencrypt.org"`.
3. **Linode token:** Cloud Manager → API Tokens → Create a Personal Access Token: **Domains = Read/Write**, everything else **No Access**, with an expiry. Better: create it while logged in as a restricted user whose only grant is `advancedsettings.cloud` read/write.
4. Check: `dig +short api.advancedsettings.cloud @ns1.linode.com` returns `APP_PUBLIC_IP`.

## 3. Install Docker Engine (official repo)

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt update
sudo apt -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER && newgrp docker
docker version && docker compose version
```
Optional `/etc/docker/daemon.json` (log rotation), then `sudo systemctl restart docker`:
```json
{ "log-driver": "json-file", "log-opts": { "max-size": "20m", "max-file": "5" } }
```

## 4. Firewall (ufw + DOCKER-USER)

Follow ARCHITECTURE.md §9 → "Docker + ufw gotcha": add the `DOCKER-USER` block to `/etc/ufw/after.rules` (with your NIC name), then:
```bash
sudo ufw default deny incoming && sudo ufw default allow outgoing
sudo ufw allow from <ADMIN_SUBNET_OR_VPN> to any port 22 proto tcp
sudo ufw allow 7881/tcp
sudo ufw allow 50000:50999/udp
sudo ufw allow 3478 && sudo ufw allow 5349/tcp
sudo ufw allow 49160:49200/udp
sudo ufw allow from 172.16.0.0/12 to any port 7880 proto tcp
# only if coturn has its own IP on 443:  sudo ufw allow to TURN_LAN_IP port 443 proto tcp
sudo ufw enable && sudo ufw status verbose
```
Before `ufw enable`, confirm your SSH source subnet is allowed, or you'll lock yourself out (hypervisor console is the way back in).

## 5. Get the files onto the VM

```bash
sudo mkdir -p /opt/trades-dispatch && sudo chown $USER: /opt/trades-dispatch
# Option A (once it's in a repo):  git clone <repo-url> /opt/trades-dispatch
# Option B (copy from a workstation): rsync -av trades-dispatch/ trades-app:/opt/trades-dispatch/
cd /opt/trades-dispatch
```

## 6. Configure `.env` and secrets

```bash
cp .env.example .env && chmod 600 .env
# Generate secrets
for v in POSTGRES_PASSWORD S3_SECRET_KEY TURN_SECRET JWT_SECRET; do
  sed -i "s|^$v=.*|$v=$(openssl rand -hex 32)|" .env; done
sed -i "s|^LIVEKIT_API_KEY=.*|LIVEKIT_API_KEY=API$(openssl rand -hex 6)|; s|^LIVEKIT_API_SECRET=.*|LIVEKIT_API_SECRET=$(openssl rand -hex 32)|" .env
nano .env    # set APP_PUBLIC_IP, APP_LAN_IP, TURN_PUBLIC_IP, TURN_LAN_IP, LINODE_DNS_API_TOKEN, S3_ACCESS_KEY, Stripe test keys
# LiveKit reads the TURN secret from a file
mkdir -p secrets && grep '^TURN_SECRET=' .env | cut -d= -f2- | tr -d '\n' > secrets/turn_secret && chmod 600 secrets/turn_secret
docker compose config -q && echo "compose OK"
```
(Until `apps/api` and `apps/admin` exist, start only the infra services listed below.)

## 7. Bring it up (in order)

```bash
# 1) Data + Caddy first: get the wildcard cert (DNS-01 takes ~2-3 min with the propagation delay)
docker compose up -d --build postgres redis minio caddy   # add api admin once their Dockerfiles exist
docker compose logs -f caddy      # wait for: "certificate obtained successfully" for *.advancedsettings.cloud

# 2) Export the cert for coturn, then start media
./infra/scripts/export-certs.sh
docker compose up -d livekit coturn
docker compose ps
```

Daily cert export (systemd timer):
```bash
sudo tee /etc/systemd/system/trades-certs.service >/dev/null <<'UNIT'
[Unit]
Description=Export Caddy wildcard cert to coturn
[Service]
Type=oneshot
WorkingDirectory=/opt/trades-dispatch
ExecStart=/opt/trades-dispatch/infra/scripts/export-certs.sh
UNIT
sudo tee /etc/systemd/system/trades-certs.timer >/dev/null <<'UNIT'
[Unit]
Description=Daily cert export
[Timer]
OnCalendar=daily
RandomizedDelaySec=1h
Persistent=true
[Install]
WantedBy=timers.target
UNIT
sudo systemctl daemon-reload && sudo systemctl enable --now trades-certs.timer
```

## 8. Verification checks (from outside, ideally a phone hotspot)

(In the table, `\|` is just Markdown escaping. Type a plain `|` when running the commands.)

| Check | Command / tool | Expect |
|---|---|---|
| DNS | `dig +short api.advancedsettings.cloud turn.advancedsettings.cloud` | `APP_PUBLIC_IP` / `TURN_PUBLIC_IP` |
| Wildcard cert | `echo \| openssl s_client -connect api.advancedsettings.cloud:443 -servername api.advancedsettings.cloud 2>/dev/null \| openssl x509 -noout -subject -issuer -enddate` | `CN=*.advancedsettings.cloud`, Let's Encrypt issuer |
| API | `curl -sI https://api.advancedsettings.cloud/health` | `200` (once the API exists; until then `502` from Caddy proves TLS + routing work) |
| Admin restricted | `curl -sI https://admin.advancedsettings.cloud` from **cellular** | `403`; from LAN/VPN: `200` |
| Unknown host | `curl -sI https://foo.advancedsettings.cloud` (needs a wildcard A or `--resolve`) | connection aborted |
| LiveKit signaling | `curl -s https://rtc.advancedsettings.cloud` | `OK` |
| LiveKit end-to-end | `livekit-cli` (`lk`): `lk token create --api-key ... --api-secret ... --join --room test --identity a` → open **https://meet.livekit.io** → "Custom" → server `wss://rtc.advancedsettings.cloud` + token. Or run `lk load-test --url wss://rtc.advancedsettings.cloud --api-key ... --api-secret ... --room test --video-publishers 1 --subscribers 2 --duration 30s` | Video connects; load test reports no packet loss. In the meet UI connection stats, the candidate pair should show `APP_PUBLIC_IP`. |
| LiveKit connectivity test | **https://livekit.io/connection-test** with `wss://rtc.advancedsettings.cloud` + a token | All green: WebSocket, WebRTC, TURN, UDP, TCP |
| TURN cert | `openssl s_client -connect turn.advancedsettings.cloud:5349 -servername turn.advancedsettings.cloud </dev/null 2>/dev/null \| openssl x509 -noout -subject -enddate` | `CN=*.advancedsettings.cloud` |
| TURN relay (trickle ICE) | Generate temporary creds: `u=$(( $(date +%s) + 3600 )):test; p=$(printf %s "$u" \| openssl dgst -binary -sha1 -hmac "$(cat secrets/turn_secret)" \| base64)` → open **https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/** → add `turn:turn.advancedsettings.cloud:3478?transport=udp` and `turns:turn.advancedsettings.cloud:5349?transport=tcp` with user `$u` / pass `$p` → "Gather candidates" | `srflx` = your client's public IP **and** `relay` candidates with `TURN_PUBLIC_IP`. No `relay` = wrong ports/NAT/secret. |
| Ports from outside | `nmap -Pn -p 80,443,7881,5349,3478 APP_PUBLIC_IP` and `nmap -sU -p 3478 TURN_PUBLIC_IP` | open; 22/5432/6379/7880 **filtered** |
| Firewall | `sudo ufw status verbose`; `sudo iptables -L DOCKER-USER -n -v` | rules present; DROP counter ticks on scans |

Then: hypervisor snapshot ("stack-up"), set up backups (ARCHITECTURE.md §9 → Backups) and Uptime Kuma checks for `api.`, `rtc.`, and `turn.:5349` from **outside** the home network.

## 9. Day-2 basics

- Update: `git pull && docker compose pull && docker compose up -d --build` (pin image tags/digests for prod; snapshot first).
- Logs: `docker compose logs -f --tail=200 <svc>`.
- Rotate the Linode token before it expires: update `.env`, `docker compose up -d caddy`.
- Rotate the TURN secret: update `.env` + `secrets/turn_secret`, `docker compose up -d livekit coturn`.
- Moving to Linode later: same steps 3–8 on a Linode Ubuntu 24.04 instance (public IP on the instance, so all four IP vars = the Linode IP; use a Linode Cloud Firewall with the same port table), restore data, repoint the A records.
