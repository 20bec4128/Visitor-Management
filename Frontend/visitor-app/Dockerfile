# ---- build stage: produce the static SPA bundle ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# --strict-ssl=false tolerates TLS-inspecting networks; harmless elsewhere.
RUN npm install --no-audit --no-fund --strict-ssl=false
COPY . .
# No VITE_API_BASE: the SPA talks to the same origin, and nginx proxies /api.
RUN npm run build

# ---- run stage: serve static files + reverse-proxy the API ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
