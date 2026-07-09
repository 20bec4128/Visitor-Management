#!/usr/bin/env bash
# Provision a new customer (tenant): writes its env file and launches its stack.
#
# Usage:
#   ./new-tenant.sh <tenant> <http-port> [public-url] [admin-user] [admin-password]
# Example:
#   ./new-tenant.sh hospital-a 8080 https://hospital-a.yourvms.com admin@hospital-a.com 'Str0ng!Pass'
set -euo pipefail

TENANT="${1:?tenant slug required}"
HTTP_PORT="${2:-8080}"
SLUG="$(echo "$TENANT" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9-' '-')"
DB_NAME="vms_$(echo "$SLUG" | tr '-' '_')"
PUBLIC_URL="${3:-http://localhost:$HTTP_PORT}"
ADMIN_USER="${4:-admin}"
ADMIN_PASSWORD="${5:-Admin@123}"

gen_secret() { openssl rand -base64 36; }
AUTH_SECRET="$(gen_secret)"
DB_PASSWORD="$(gen_secret)"

mkdir -p tenants
ENV_FILE="tenants/$SLUG.env"
[ -e "$ENV_FILE" ] && { echo "Tenant '$SLUG' already exists ($ENV_FILE)."; exit 1; }

cat > "$ENV_FILE" <<EOF
TENANT_NAME=$SLUG
DB_NAME=$DB_NAME
DB_USER=vms
DB_PASSWORD=$DB_PASSWORD
AUTH_SECRET=$AUTH_SECRET
ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASSWORD
PUBLIC_URL=$PUBLIC_URL
HTTP_PORT=$HTTP_PORT
EOF

echo "Wrote $ENV_FILE"
echo "Starting stack 'vms_$SLUG' on port $HTTP_PORT ..."
docker compose -p "vms_$SLUG" --env-file "$ENV_FILE" up -d --build

cat <<EOF

Tenant '$SLUG' is up:
  URL:      $PUBLIC_URL  (local: http://localhost:$HTTP_PORT)
  Admin:    $ADMIN_USER
  Password: $ADMIN_PASSWORD
  Env file: $ENV_FILE  (keep it safe — it holds the secrets)
EOF
