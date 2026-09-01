# Multi-stage: the toolchain never reaches the shipped image, so what gets
# deployed is nginx plus static files and nothing else.

# ---- Build ------------------------------------------------------------------
FROM node:24-alpine AS build

WORKDIR /app

# Dependencies are copied and installed before the source, so a source-only
# change reuses the cached install layer.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Regenerated at build time so a deployed image never ships stale relative due
# dates — every "due in 2 days" is two days from the build, not from whenever the
# fixtures were last committed.
RUN node data-fetching/generate-data.js && npm run build

# ---- Serve ------------------------------------------------------------------
FROM nginx:1.27-alpine AS serve

# The Angular application builder emits into a `browser` subdirectory.
COPY --from=build /app/dist/task-management-dashboard/browser /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# This image serves the front end only. The application needs a write-capable
# API, which no bundle of static JSON can be, so /api is proxied to json-server
# and `docker compose up` is the supported way to run the container. A bare
# `docker run` still boots the UI; /api answers 503 with a message saying so.

EXPOSE 80

# Fails the container health check rather than serving a broken app silently.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
