# Frontend — TanStack Start (React 19 / Vite 8) SSR built as a standalone Node
# server. Build context is the repo root.

# ---- build stage ----
FROM node:22-slim AS build
WORKDIR /app

# pnpm via corepack, pinned to the version matching the v6 lockfile (see
# package.json "packageManager"). Without the pin, corepack's default (pnpm
# 9/10) rejects the lockfile.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@8.10.4 --activate

# VITE_* vars are baked into the client bundle at BUILD time, so pass as a build
# arg. This is the URL the reader's browser uses to reach PocketBase.
ARG VITE_POCKETBASE_URL
ENV VITE_POCKETBASE_URL=${VITE_POCKETBASE_URL}

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
# vite.config.ts sets nitro preset "node-server" -> output in .output/
RUN pnpm build

# ---- runtime stage ----
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# .output is self-contained (bundled server + deps), so only copy that.
COPY --from=build /app/.output ./.output

# Exposed to the compose network / Coolify proxy only — no host port binding.
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
