# ==========================================
# 📦 STEP 1: BASE OS INFRASTRUCTURE
# ==========================================
FROM node:22-alpine AS base
RUN apk add --no-cache tzdata
ENV NODE_ENV=production
ENV TZ=UTC

# ==========================================
# 🛠️ STEP 2: DEPENDENCIES COMPILATION
# ==========================================
FROM base AS build
WORKDIR /root
COPY package*.json ./
RUN npm install \
  && npm prune \
  && npm cache clean --force

# ==========================================
# 🚀 STEP 3: PREMIUM ENVIRONMENT RUNTIME
# ==========================================
FROM base AS prod
USER node
WORKDIR /home/node

# Copy application files with proper permissions safely
COPY --chown=node:node . /home/node
COPY --chown=node:node --from=build /root/node_modules /home/node/node_modules

# Expose Web Interface (1080) and SMTP Incoming (1025) channels
EXPOSE 1080 1025
ENV MAILDEV_WEB_PORT=1080
ENV MAILDEV_SMTP_PORT=1025

# Core autonomous synchronization execution pointer redirected to index.js
ENTRYPOINT ["node", "index.js"]

# Live application stability validation healthcheck pipeline
HEALTHCHECK --interval=10s --timeout=1s \
  CMD wget -O - http://localhost:${MAILDEV_WEB_PORT}${MAILDEV_BASE_PATHNAME}/healthz || exit 1
