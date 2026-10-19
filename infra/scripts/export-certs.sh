#!/usr/bin/env bash
# Copy Caddy's wildcard cert out of the caddy_data volume for coturn (turns:5349 / 443).
# Run from the repo root on the VM. Install as a daily systemd timer (see DEPLOY.md).
# Restarts coturn only when the cert actually changed (Caddy renews ~30 days before expiry).
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root (for docker compose)

PROJECT="${COMPOSE_PROJECT_NAME:-trades-dispatch}"
NAME="wildcard_.advancedsettings.cloud"
SRC="/data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/${NAME}"
DEST="$PWD/infra/coturn/certs"
COTURN_UID="${COTURN_UID:-65534}"   # coturn/coturn image runs as nobody; verify: docker compose exec coturn id

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT

docker run --rm -v "${PROJECT}_caddy_data:/data:ro" -v "$tmp:/out" alpine:3 \
  sh -c "cp '${SRC}/${NAME}.crt' /out/fullchain.pem && cp '${SRC}/${NAME}.key' /out/privkey.pem"

if cmp -s "$tmp/fullchain.pem" "$DEST/fullchain.pem" 2>/dev/null; then
  echo "cert unchanged"; exit 0
fi

install -m 0644 -o "$COTURN_UID" "$tmp/fullchain.pem" "$DEST/fullchain.pem"
install -m 0600 -o "$COTURN_UID" "$tmp/privkey.pem"   "$DEST/privkey.pem"
echo "cert updated; restarting coturn"
docker compose restart coturn
