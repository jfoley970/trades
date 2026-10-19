# Caddy with the Linode DNS provider for ACME DNS-01 (wildcard *.advancedsettings.cloud)
# Pin versions for prod, e.g. caddy:2.10-builder / caddy:2.10
FROM caddy:2-builder AS builder
RUN xcaddy build \
    --with github.com/caddy-dns/linode

FROM caddy:2
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
