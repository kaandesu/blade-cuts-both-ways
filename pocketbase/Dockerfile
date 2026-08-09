# PocketBase — backend for chapters, the waitlist, and the /admin login.
# Downloads the pinned official release binary onto a tiny Alpine base.
FROM alpine:3.20

# Bump to pull a newer PocketBase; check https://github.com/pocketbase/pocketbase/releases
ARG PB_VERSION=0.39.9
# amd64 by default (typical Coolify host); pass --build-arg PB_ARCH=arm64 for ARM.
ARG PB_ARCH=amd64

RUN apk add --no-cache ca-certificates unzip wget

WORKDIR /pb

RUN wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip" -O /tmp/pb.zip \
    && unzip /tmp/pb.zip -d /pb \
    && rm /tmp/pb.zip \
    && chmod +x /pb/pocketbase

# App schema (auto-applied on serve) and server-side logic (routes, guards).
COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks

COPY entrypoint.sh /pb/entrypoint.sh
RUN chmod +x /pb/entrypoint.sh

# Persisted SQLite database + uploads live here (mount a volume on this path).
VOLUME ["/pb/pb_data"]

# Exposed to the compose network / Coolify proxy only — no host port binding.
EXPOSE 8090

ENTRYPOINT ["/pb/entrypoint.sh"]
