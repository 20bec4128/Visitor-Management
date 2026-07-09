# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Visitor Management System with three independently-run services:

- **Backend/visitor-management** — Spring Boot 3.5 / Java 17 REST API (PostgreSQL, port `8081`). The system of record.
- **Backend/face-service** — Python FastAPI face-encoding microservice (InsightFace `buffalo_l`, 512-dim ArcFace embeddings, port `8000`). Stateless.
- **Frontend/visitor-app** — React 19 + Vite 8 SPA (react-router-dom 7, dev port `5173`).

Note: this directory is *not* the root of its own git repo — it lives inside a larger parent repo whose commit history is unrelated. Don't rely on `git log` here for project context.

## Running locally

Start all three (each in its own terminal). The face-service and DB must be up before the backend.

```bash
# 1. Face service
cd Backend/face-service
python -m venv .venv && .venv\Scripts\activate   # PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000

# 2. Spring Boot backend (needs PostgreSQL DB "VisitorManagement" running)
cd Backend/visitor-management
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run

# 3. Frontend
cd Frontend/visitor-app
npm install
npm run dev
```

Backend tests / build:

```bash
cd Backend/visitor-management
./mvnw test                                                  # all tests
./mvnw test -Dtest=VisitorManagementApplicationTests        # single test class
./mvnw clean package                                         # build JAR (target/*.jar)
```

Frontend: `npm run build` (Vite), `npm run lint` (ESLint), `npm run preview`.

[seed_demo_data.py](seed_demo_data.py) (repo root, stdlib-only) seeds every module via the REST API as admin — run it against a live backend to populate staff/visitors/visits/pre-register/contact-diary/notices/categories/templates/settings. Tolerant of re-runs.

### Build/run gotchas (this dev environment)

- **`mvnw`/`mvnw.cmd` fail offline** (can't fetch the wrapper distribution). A working Maven is cached at `~/.m2/wrapper/dists/apache-maven-3.9.14/<hash>/bin/mvn` — invoke it with `-o` (offline). Plugin-prefix resolution (`spring-boot:run`) also flakes offline; use the **fully-qualified goal** instead: `mvn -o org.springframework.boot:spring-boot-maven-plugin:3.5.13:run`. Cap heap with `MAVEN_OPTS="-Xmx512m"` if the JVM fails to allocate.
- **`npm install` needs `--strict-ssl=false`** here — the network does TLS inspection, so the registry returns `UNABLE_TO_VERIFY_LEAF_SIGNATURE` without it.
- **The backend does not hot-reload.** After changing Java code you must rebuild *and restart* the running process. A stale process serving an endpoint that exists in source returns `404 "No static resource api/..."` (the request fell through to static-resource handling because no handler is registered yet) — that symptom almost always means "restart the backend," not "the route is wrong."
- **Offline rebuild/restart recipe** (what actually works here): kill the running process first (the JAR is file-locked while running, so `clean` fails otherwise), then package and run the JAR *from the backend dir* so it picks up `.env`:
  ```bash
  # stop the running backend (find PID on :8081, taskkill //PID <pid> //F)
  cd Backend/visitor-management
  MAVEN_OPTS="-Xmx512m" ~/.m2/wrapper/dists/apache-maven-3.9.14/<hash>/bin/mvn -o clean package -DskipTests
  java -jar target/visitor-management-0.0.1-SNAPSHOT.jar    # must run from this dir to load .env
  ```
  `HIBERNATE_DDL_AUTO=update` auto-adds new entity columns on the next start, so schema changes need no migration.

## Configuration

- **Backend** reads config from env vars (see [application.properties](Backend/visitor-management/src/main/resources/application.properties), every key has an env override). It also imports an optional `.env` file from the working directory at startup (`spring.config.import=optional:file:.env`), so PM2/systemd deploys don't need a rebuilt JAR. Key vars: `SPRING_DATASOURCE_URL/USERNAME/PASSWORD`, `FACE_SERVICE_URL`, `FACE_MATCH_THRESHOLD`, `AUTH_SECRET`, `BOOTSTRAP_ADMIN_USERNAME/PASSWORD`, `FRONTEND_URL` (CORS), SMTP `spring.mail.*`.
- `HIBERNATE_DDL_AUTO` defaults to **`update`** (Hibernate adds new columns/tables but preserves data across restarts). Setting it to `create` drops and recreates the schema on every start — useful for a clean slate, but wipes all data.
- **Two separate mail paths — keep both in mind.** (1) [MailService](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/service/MailService.java) builds a `JavaMailSenderImpl` on demand from the **DB-stored `email` settings section** (`smtpHost/smtpUser/...`) — used by the "send test email" and templated emails; configurable from the Settings UI with **no restart**. (2) `PreRegisterService`/`VisitRequestService` autowire Spring's **`JavaMailSender` bean** configured from `spring.mail.*` (env keys `SMTP_HOST/SMTP_PORT/SMTP_USERNAME/SMTP_PASSWORD/...` in `.env`) — used for pre-register/visit notification + approval (token+QR) emails. Both must be configured for *all* mail to work. On a TLS-inspecting network, set `mail.smtp.ssl.trust` / `SMTP_SSL_TRUST=<host>` or STARTTLS fails with "unable to find valid certification path".
- Uploaded images are written under `app.uploads.dir` (`APP_UPLOADS_DIR`, default `uploads/`) and served as static files at `/uploads/**` by [StaticFilesConfig](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/config/StaticFilesConfig.java). That path is **outside `/api/**`, so it bypasses the RBAC interceptor** — uploaded media is publicly readable by URL.
- **Frontend** uses `VITE_API_BASE` (see [.env.example](Frontend/visitor-app/.env.example)). When unset, [api/base.js](Frontend/visitor-app/src/api/base.js) auto-resolves: `localhost:8081` on local hostnames, otherwise same-origin (`window.location.origin`) — so a reverse-proxied prod deploy needs no build-time API URL.

## Architecture

### Custom RBAC (not Spring Security)

Authn/authz is hand-rolled, **not** Spring Security's filter chain. Two pieces:

- **Tokens** ([AuthTokenService](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/rbac/AuthTokenService.java)): a stateless `base64url(payload).base64url(HmacSHA256(payload))` string signed with `AUTH_SECRET`. Carries only `{username, issuedAt}` — **no expiry is enforced**. Frontend stores it in `localStorage` under `visitorManagement.auth` and sends `Authorization: Bearer <token>`.
- **Interceptor** ([RbacInterceptor](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/rbac/RbacInterceptor.java), registered for `/api/**` in [RbacWebConfig](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/config/RbacWebConfig.java)): verifies the token, loads the user + role permissions, stuffs an `AuthSession` into a ThreadLocal `AuthContext` (cleared in `afterCompletion`), and enforces permissions.

Controller endpoints declare requirements with `@RequiresPermissions("visitors.create")` (class- or method-level; method perms are additive). Endpoints with no annotation require only a valid token. Public endpoints (login, bootstrap, pre-register entry by token) are marked `@AnonymousAccess`. `OPTIONS` preflight always passes.

**Permission keys are the single source of truth and are duplicated in two places that must stay in sync:**
- Backend: [PermissionCatalog.java](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/rbac/PermissionCatalog.java) (string constants + the per-role default sets: ADMIN/MANAGER/RECEPTIONIST/SECURITY/EMPLOYEE).
- Frontend: [rbac/access.js](Frontend/visitor-app/src/rbac/access.js) (`PERMISSIONS` map + `ROUTE_PERMISSIONS`).

The `ADMIN` role is special-cased everywhere — it's granted *all* permissions implicitly (backend `PermissionCatalog.isAdmin`, frontend `hasPermission`), never via stored rows. An admin account is seeded on every startup by [AdminBootstrapRunner](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/config/AdminBootstrapRunner.java).

Frontend route guarding mirrors this: `<ProtectedRoute requiredPermissions={[...]}>` wraps pages in [routes/appRoutes.jsx](Frontend/visitor-app/src/routes/appRoutes.jsx). This is **UX only** — the backend interceptor is the real gate.

**Two distinct user entities (easy to confuse):** [AppUser](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/entity/AppUser.java) is the *login* account (`username` = email, hashed password, single `role` string) the interceptor authenticates against. [StaffUser](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/entity/StaffUser.java) is the *staff directory* row (name/phone/profile, `ManyToMany` roles) and is what acts as a visit/booking **host**. `StaffUserService.create` writes **both** (the StaffUser plus a matching AppUser login). The seeded bootstrap accounts (`AdminBootstrapRunner`/`AuthService`) only create AppUsers.

**Host-scoping:** for an `EMPLOYEE` session, `PreRegisterService` and `VisitRequestService` filter lists and guard approve/reject/get to only the bookings/visits where that employee is the host (`requireEmployeeOwnership`, matched by email). ADMIN and other roles see everything. This is enforced server-side, independent of the permission keys.

**Login/logout history** is recorded in [AuthController](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/controller/AuthController.java) (`loggedHistoryService.record(...)`), **not** in `AuthService.login` — look there when touching the logged-history feature.

### Face recognition flow

The Spring backend never runs ML — it delegates to the FastAPI service over HTTP.

1. `face-service` `POST /embed` (alias `/encode`) takes a base64 data-URL image, runs InsightFace, returns the largest face's 512-float embedding (or `[]` if no face found).
2. On visitor enrollment the backend calls the service via [FaceServiceClient](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/service/FaceServiceClient.java) and persists the embedding as a **JSON string** in `VisitorFace.embeddingJson`.
3. On a match request, [VisitorFaceMatchService](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/service/VisitorFaceMatchService.java) embeds the query image, then does an **in-memory linear scan** over all stored faces computing cosine similarity, returning the best above `FACE_MATCH_THRESHOLD` (default `0.5`). There is no vector index — this is O(n) per match.

### App settings, branding & email templates

- **Settings** are a generic key→JSON store: [SettingsController](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/controller/SettingsController.java) persists one `AppSetting` row per section (`general`/`email`/`payment`) as a JSON blob via `GET/PUT /api/settings/{section}` (requires `settings.manage`). Adding a field is frontend-only (extend the section in [SettingsPage.jsx](Frontend/visitor-app/src/pages/SettingsPage.jsx)); the backend stores whatever JSON it's given.
- **Branding is applied app-wide:** `GET /api/settings/branding` is **`@AnonymousAccess`** (every user needs it for the header, not just admins) and returns `companyName`+`companyLogo` from the `general` section. The [useBranding](Frontend/visitor-app/src/hooks/useBranding.js) hook feeds `DashboardShell` → Sidebar/Topbar and refreshes on the `vm:branding-updated` window event (dispatched when General settings save). Logo upload: `POST /api/settings/general/logo` (multipart) stores under `uploads/settings/` and merges the path into the `general` JSON.
- **Email templates are actually used:** [EmailTemplateService](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/service/EmailTemplateService.java) `sendForModule(module, to, vars)` looks up the enabled template by `module` name and substitutes `(shortcode)` tokens (parenthesised, e.g. `(new_user_name)`, plus `company_*` pulled from settings), then sends via `MailService`. Currently wired to the **"New User"** module on staff creation (`StaffUserService.create`). Templated email is best-effort and never breaks the main flow.

### Payments (Razorpay)

[PaymentService](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/service/PaymentService.java) integrates Razorpay, driven entirely by the **`payment` settings section** (`gateway`/`keyId`/`keySecret`/`currency`/`enabled`) — no env vars, configurable from the Settings UI. The flow ([PaymentController](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/controller/PaymentController.java), `/api/payments`) is invoked from the Create-Visitor wizard when a **paid visit category** is selected:

- `GET /config` (any authenticated user) returns only publishable fields — `enabled`, `gateway`, `keyId`, `currency`. **`keySecret` never leaves the backend.**
- `POST /order` calls Razorpay `/v1/orders` server-side (amounts are in major units / rupees, converted to paise) and returns the order for the browser checkout.
- `POST /verify` recomputes the HMAC-SHA256 signature (`orderId|paymentId` keyed by `keySecret`, constant-time compared) and only then persists a `Payment` row. Listing payments requires `payments.view`.

### Real-time: team chat, calls & SOS (STOMP over WebSocket)

This is the **only** real-time part of the system. [WebSocketConfig](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/config/WebSocketConfig.java) registers a SockJS STOMP endpoint at **`/ws`** with an in-memory simple broker (`/topic`, `/queue`, app prefix `/app`, user prefix `/user`). It is **single-instance only** — scaling out needs an external broker relay.

- **Auth reuses the REST token, not Spring Security.** [StompAuthChannelInterceptor](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/rbac/StompAuthChannelInterceptor.java) reads `Authorization: Bearer <token>` from the STOMP **CONNECT** frame, verifies it with the same `AuthTokenService`, and attaches a `StompPrincipal{username, role}`. It also authorizes every **SUBSCRIBE** (a user may only subscribe to `/topic/chat/all`, `/topic/chat/role/<theirRole>` (ADMIN: any), `/topic/sos`, and `/user/**`). The frontend connects via [RealtimeProvider](Frontend/visitor-app/src/realtime/RealtimeProvider.jsx) (mounted above the router in [App.jsx](Frontend/visitor-app/src/App.jsx) so the socket survives navigation).
- **Chat** ([ChatService](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/service/ChatService.java)): one `ChatMessage` table; the `channel` column encodes the conversation — `all`, `role:<ROLE>`, or `dm:<a>|<b>` (usernames lower-cased + sorted, canonical). DMs are delivered with `convertAndSendToUser` (resolve the **real-cased** username first — the channel key is lower-cased but user-destination routing is case-sensitive); channels broadcast to the topic. Frontend sends via REST `POST /api/chat/messages` and receives the echo over STOMP (no optimistic append → no dupes). UI: [useChat](Frontend/visitor-app/src/realtime/useChat.js) + [ChatView](Frontend/visitor-app/src/components/chat/ChatView.jsx); a global [FloatingChat](Frontend/visitor-app/src/components/chat/FloatingChat.jsx) launcher plus the `/chat` page.
- **Calls** ([CallController](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/controller/CallController.java)): WebRTC; the backend only **relays signaling** (`@MessageMapping /app/call.signal` → target's `/user/queue/call`) and serves ICE config from env (`WEBRTC_STUN_URLS`, `WEBRTC_TURN_URL/USERNAME/CREDENTIAL`) via `GET /api/calls/ice-servers`. Media is browser-to-browser. [CallProvider](Frontend/visitor-app/src/components/call/CallProvider.jsx) holds the `RTCPeerConnection` state machine. **Caveats:** cross-NAT calls need a real TURN server (STUN-only default won't traverse firewalls), and `getUserMedia` requires a secure origin (HTTPS or localhost).
- **SOS** ([SosService](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/service/SosService.java)): `POST /api/sos` (any valid token — everyone can raise an alarm) persists a `SosAlert` and broadcasts to `/topic/sos`; [SosAlertOverlay](Frontend/visitor-app/src/components/sos/SosAlertOverlay.jsx) shows a full-screen siren to all users; resolving needs `sos.resolve`.
- **Permissions** `chat.use`, `sos.view`, `sos.resolve` follow the usual two-catalog sync rule. Note they were added to the **role default sets**, so the seeded roles pick them up automatically on the next startup (`AuthService.ensureRole` → `mergeMissingPermissions`); **custom roles created in the Roles UI do not** and must be granted the keys manually.

### Backend package layout

Standard Spring layering under `com.techiekit.visitor_management`: `controller/` (REST, `/api/...`) → `service/` (business logic, `@Transactional`) → `repository/` (Spring Data JPA) → `entity/` (JPA), with `dto/` for request/response records and `config/` for wiring. The `rbac/` package holds the auth machinery described above.

> **Lombok is configured in the POM but not actually used** — every entity writes explicit getters/setters by hand. Follow that when adding entities, and give the JPA no-arg constructor `public` visibility (a `protected` one can't be `new`-ed from the service package).

**Adding a feature module** (the CRUD modules — contact-diary, notices, visit-categories, email-templates — are all the same shape; copy [VisitCategory*](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/controller/VisitCategoryController.java) as the template):
1. `entity/X.java` (manual getters/setters, public no-arg ctor, `created_at` Instant), `repository/XRepository` (with `findAllByOrderByCreatedAtDesc()`), `dto/XRequest`+`XResponse` records, `service/XService` (validates in `apply(...)`, formats dates with `DateTimeFormatter.ofPattern("MMM dd, yyyy")` in UTC), `controller/XController` (`@RequiresPermissions` at class level).
2. Add the permission key in **both** `PermissionCatalog.java` and `rbac/access.js` (see the RBAC section).
3. Add the frontend API calls to `src/api/config.js` and the page under `src/pages/`.

### Frontend structure

- Routing is data-driven: [routes/appRoutes.jsx](Frontend/visitor-app/src/routes/appRoutes.jsx) is an array consumed by [App.jsx](Frontend/visitor-app/src/App.jsx).
- API layer in `src/api/` — `base.js` resolves the host; `auth.js` does unauthenticated POSTs; `visitor.js`, `staff.js`, and `config.js` each define their own `requestJson` wrapper that attaches the Bearer token from [auth/authStorage.js](Frontend/visitor-app/src/auth/authStorage.js). `config.js` covers the CRUD/settings modules (contact-diary, notices, visit-categories, email-templates, settings, account) and exposes `mediaUrl(path)` to turn a server `/uploads/...` path into an absolute URL. Multipart uploads (e.g. profile photo) build a `FormData` and must **not** set `Content-Type` (the browser sets the boundary).
- The **React Compiler** is enabled (babel preset in [vite.config.js](Frontend/visitor-app/vite.config.js)) — avoid manual memoization patterns that fight it.
- Dashboard UI composed from `src/components/dashboard/` (Sidebar/Topbar/StatCard/charts via apexcharts); pages in `src/pages/`.
- **Modals must render through a portal to `document.body`** (`createPortal`). The page container `.vm-content` has a fade-in `animation` that creates a stacking context, so a `position:fixed` overlay rendered inline gets trapped *under* the sticky topbar (`z-index:120`) and appears clipped. See [ApprovalTokenModal](Frontend/visitor-app/src/components/ApprovalTokenModal.jsx) / [VisitorDetailsModal](Frontend/visitor-app/src/components/VisitorDetailsModal.jsx) for the pattern.
- **Action-column buttons** on list pages use the shared `.vm-action-btn` (fixed 32×32 icon square). A button with a *text* label (e.g. "Check Out") needs `.vm-action-checkout` so it sizes to content instead of clipping.
- Global search is live: the topbar input calls `GET /api/search?q=` ([SearchController](Backend/visitor-management/src/main/java/com/techiekit/visitor_management/controller/SearchController.java)) and shows a grouped dropdown that routes to the matching page.
