# syntax=docker/dockerfile:1
# The image Release builds in GitHub Actions and deploys to Dokku with `git:from-image`. Dokku reads
# the Procfile and app.json from /app, and runs Procfile commands as plain argv (no shell).
FROM node:22.22.2-bookworm-slim AS base
# Prisma's engines need OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Production dependencies: a cached layer until the lockfile or schema changes.
FROM base AS deps
COPY package.json yarn.lock ./
COPY prisma prisma
RUN yarn install --frozen-lockfile --production && npx prisma generate && yarn cache clean

FROM base AS build
COPY package.json yarn.lock ./
COPY prisma prisma
RUN yarn install --frozen-lockfile
COPY bank/web/package.json bank/web/package-lock.json bank/web/
RUN npm ci --prefix bank/web --include=dev
COPY . .
RUN npx tsc --skipLibCheck && npm --prefix bank/web run build

FROM base
LABEL org.opencontainers.image.source=https://github.com/sgoodrow/castle
ENV NODE_ENV=production HOME=/home/app
# uid 32767 is the one herokuish ran as, so it still owns the bank cache Dokku mounts at /app/bank/cache.
RUN useradd --uid 32767 --create-home --home-dir /home/app app && chown app:app /app
COPY --from=deps /app/node_modules node_modules
COPY --chown=app:app . .
COPY --from=build /app/dist dist
COPY --from=build /app/bank/dist bank/dist
# Dokku sets GIT_REV to a commit of its own for image deploys; this is the commit the image was built from.
ARG SOURCE_REV=""
ENV SOURCE_REV=$SOURCE_REV
USER app
CMD ["node", "dist/index.js"]
