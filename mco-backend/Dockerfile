# syntax=docker/dockerfile:1

ARG BUN_VERSION=1.2.4

FROM oven/bun:${BUN_VERSION}-alpine

# Use production node environment by default.
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.bun/install/cache to speed up subsequent builds.
RUN --mount=type=bind,source=app/package.json,target=package.json \
    --mount=type=bind,source=app/bun.lockb,target=bun.lockb \
    --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production

# Run the application as a non-root user.
USER bun

# Copy the rest of the source files into the image.
COPY . .

# Expose the port that the application listens on.
EXPOSE 8080

# Run the application.
CMD ["bun", "run", "app/src/index.ts"]
