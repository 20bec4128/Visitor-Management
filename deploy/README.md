# Deploying as SaaS — one isolated stack per customer (Option A)

Each customer (a company / hospital / school) runs as its **own self-contained
stack**: its own PostgreSQL database, backend, frontend and face-service. No data
is ever shared between customers, and each gets its own admin login and branding
(logo + company name set from **Settings → General** inside their app).

```
                         ┌─ tenant: hospital-a ─────────────┐
   hospital-a.yourvms.com│  frontend → backend → db          │  (port 8080)
                         │                    └→ face-service │
                         └───────────────────────────────────┘
   school-b.yourvms.com  ┌─ tenant: school-b  (port 8081) … ─┐
                         └───────────────────────────────────┘
   reverse proxy maps each subdomain → that tenant's HTTP_PORT
```

## Prerequisites (on the deployment server)

- **Docker** + **Docker Compose v2** (`docker compose …`).
- A server with internet access on first run (the build pulls base images and the
  face model downloads once; both are then cached).
- Optional but recommended: a reverse proxy (Caddy / Nginx / Traefik) terminating
  HTTPS and mapping each customer's subdomain to its `HTTP_PORT`.

## Provision a new customer

From this `deploy/` folder:

```bash
# Linux server
./new-tenant.sh hospital-a 8080 https://hospital-a.yourvms.com admin@hospital-a.com 'Str0ng!Pass'

# Windows
./new-tenant.ps1 -Tenant hospital-a -HttpPort 8080 -PublicUrl https://hospital-a.yourvms.com -AdminUser admin@hospital-a.com -AdminPassword 'Str0ng!Pass'
```

The script:
1. generates a **unique random `AUTH_SECRET` and DB password** for that tenant,
2. writes `tenants/<tenant>.env` (keep this file safe — it holds the secrets),
3. builds and starts the stack as a separate Compose project `vms_<tenant>`.

Give the customer their URL + admin credentials. They log in and set their own
logo/company name under **Settings → General**.

> Pick a **unique `HTTP_PORT` per tenant** on the same server (8080, 8081, 8082 …).

## Point a subdomain at a tenant (reverse proxy)

Example with Caddy (`Caddyfile`) — automatic HTTPS:

```
hospital-a.yourvms.com { reverse_proxy localhost:8080 }
school-b.yourvms.com   { reverse_proxy localhost:8081 }
```

## Day-2 operations

```bash
# List a tenant's containers / logs
docker compose -p vms_hospital_a --env-file tenants/hospital-a.env ps
docker compose -p vms_hospital_a --env-file tenants/hospital-a.env logs -f backend

# Update a tenant to the latest code (rebuild + restart, data preserved)
git pull
docker compose -p vms_hospital_a --env-file tenants/hospital-a.env up -d --build

# Stop / remove a tenant (KEEPS data volumes)
docker compose -p vms_hospital_a --env-file tenants/hospital-a.env down

# Back up a tenant's database
docker compose -p vms_hospital_a --env-file tenants/hospital-a.env exec -T db \
  pg_dump -U vms vms_hospital_a > backups/hospital-a-$(date +%F).sql
```

Data lives in named Docker volumes (`db-data`, `uploads`, `face-models`) scoped to
each Compose project, so `up --build` upgrades code without touching data
(`HIBERNATE_DDL_AUTO=update` adds new columns automatically).

## Notes

- **Email**: each customer configures their SMTP in **Settings → Email** (stored in
  their own DB) and can send a test from there — no redeploy needed.
- **Face-service** is bundled per tenant for full isolation. If RAM is tight and you
  trust co-tenancy of a stateless compute service, you can run one shared
  face-service and point every tenant's `FACE_SERVICE_URL` at it instead (it stores
  no data — embeddings live in each tenant's DB).
- **Scaling limit**: this model is great up to ~dozens of customers per server. Past
  that, the multi-tenant model (single shared app, data scoped by `organization_id`)
  becomes more efficient — that's the future "Option B".
