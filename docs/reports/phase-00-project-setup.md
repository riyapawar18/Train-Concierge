# Phase 00 — Project Setup and Audit

- **Date:** 2026-10-27
- **Branch:** `master`
- **Status:** Complete. Builds, tests, Flyway/MySQL startup, health, CORS and browser
  checks pass. The existing populated `trainconcierge` schema was left untouched;
  verification used a dedicated `trainconcierge_phase0` schema
  (see [Database conflict](#8-database-conflict)).

## 1. Audit

### Repository state before this phase

| Check | Result |
| --- | --- |
| Working directory | `C:\Users\HP\Documents\Qoder\2026-10-27\cf59d207` |
| Tracked files | `0` (`git ls-files` returned nothing) |
| Top-level files/folders | none — the directory was empty |
| Git root | `C:/` (a pre-existing repository whose only commit, `2dd6b2b`, tracks no files) |
| Existing backend packages / entities / controllers / endpoints / tests | none |
| Existing frontend pages / routes / components / API calls | none |

**Conclusion: no existing code to reuse.** There were no conflicts with the plan and no
migration work required. The monorepo was scaffolded from scratch.

Two notes:

- A separate project exists at `C:\Users\HP\trae_projects\Railway_New` outside this
  workspace. It is untracked by this repository, was not inspected, and was not modified.
  It is out of scope for this phase.
- `docs/phases/README.md` and `docs/phases/phase-00-project-setup.md` do not exist in this
  repository. This phase was implemented from the supplied brief, and the brief itself is
  the source of truth for the tasks below.

### Existing MySQL state

During live verification the local server was found to already contain three similarly
named schemas:

| Schema | Tables |
| --- | --- |
| `trainconcierge` | 15 (`users`, `bookings`, `trains`, …) |
| `train_concierge` | 17 |
| `trainconcierge_db` | 16 |

The existing `trainconcierge` MySQL user only has privileges on `train_concierge`. Running
the new Flyway baseline against the populated `trainconcierge` schema would either fail
(non-empty schema without a history table) or modify shared data, so it was **not
touched**. Verification instead used a new empty `trainconcierge_phase0` schema with a
dedicated least-privilege user. The default `DB_URL` still targets `trainconcierge`; on
this machine it must be overridden until that schema is cleaned or backed up.

### Reusable / conflicting / smallest changes

- **Reusable:** nothing.
- **Conflicts:** none.
- **Smallest change:** create `backend/`, `frontend/`, root docs and ignore rules; no
  rewrites were necessary.

## 2. Versions

| Component | Version |
| --- | --- |
| JDK | Temurin 17.0.20 |
| Maven | 3.9.16 |
| Spring Boot | 3.5.16 |
| JJWT | 0.12.6 |
| MySQL Server | 8.0.46 |
| Node.js | 24.12.0 |
| npm | 11.6.2 |
| React / React DOM | 19.3.1 |
| TypeScript | 6.0.3 |
| Vite | 8.3.5 |
| Tailwind CSS | 4.3.3 (`@tailwindcss/vite`) |
| shadcn CLI | 4.22.1 (Radix, Nova preset) |
| React Router | 7.18.4 |
| TanStack Query | 5.105.0 |
| Axios | 1.20.0 |
| React Hook Form / Zod / resolvers | 7.91.0 / 4.6.7 / 5.9.2 |
| Lucide React | 1.62.0 |
| Vitest / jsdom | 5.0.5 / 29.1.1 |

`@hookform/resolvers` was pinned to v5 because v6 declares an optional peer on
`effect@^4` that conflicts with the installed `effect@3.x` in this npm version.

## 3. What was built

### Backend (`backend/`)

- Spring Boot 3.5.16, Java 17, Maven; dependencies: Web, Security, Data JPA, Validation,
  Mail, Thymeleaf, Flyway (core + MySQL), MySQL driver, Lombok (optional), Actuator,
  JJWT API/impl/jackson, test and security-test starters.
- Feature packages under `com.trainconcierge`: `auth`, `user`, `catalog`, `booking`,
  `disruption`, `recommendation`, `notification`, `payment`, `hotel`, `admin`, `common`.
  Feature packages contain `package-info.java` only — no feature code, per scope.
- `GET /api/health` → `{"status":"UP"}`, public.
- `GlobalExceptionHandler` returns a uniform `ApiError`
  (`timestamp`, `status`, `code`, `message`, `fieldErrors[]`) for validation, malformed
  bodies, 404, 405, 403 and unexpected errors. Stack traces are never serialized; the
  generic 500 message is fixed.
- CORS allows exactly `APP_FRONTEND_ORIGIN` (default `http://localhost:5173`), all common
  methods, `Authorization`/`Content-Type`/`Accept`/`Origin`/`X-Requested-With` headers, and
  credentials. Any other origin fails preflight.
- Security is stateless with CSRF, HTTP Basic, form login and logout disabled. Only
  `/api/health`, `/actuator/health` and `/error` are public; every other path requires
  authentication (auth itself arrives in a later phase). Security 401/403 responses use the
  same `ApiError` shape. `UserDetailsServiceAutoConfiguration` is excluded so no generated
  default user exists.
- Profiles: common `application.yml`, `application-dev.yml` (MySQL, SQL logging off,
  `ddl-auto: validate`), `application-demo.yml` (adds `classpath:db/demo` migrations).
- Flyway `V1__baseline.sql` creates `schema_info`; demo migration folder exists and is empty.
- Tests use standalone MockMvc so `mvn clean verify` needs no database.

### Frontend (`frontend/`)

- Vite React-TS app; path alias `@/` → `src/` in `vite.config.ts`, `tsconfig.app.json` and
  `tsconfig.json` (`baseUrl` omitted because TypeScript 6 deprecates it; `paths` is
  relative to the config file).
- Folders: `src/app`, `src/layouts`, `src/features`, `src/components`, `src/lib`,
  `src/styles` (Tailwind/shadcn tokens live in `src/styles/index.css`).
- React Router (`src/app/router.tsx`), TanStack Query provider
  (`src/app/providers.tsx`), Axios client (`src/lib/api.ts`).
- Placeholder home page with a **development-only** health badge calling `/api/health`.
  The badge is gated by `import.meta.env.DEV`, so it is absent from production builds and is
  scheduled for removal in Phase 02.
- Vite dev proxy for `/api` plus backend CORS; both are documented.
- `.env.example` with `VITE_API_BASE_URL=http://localhost:8080/api` and
  `VITE_PROXY_TARGET=http://localhost:8080`.
- Vitest configured with jsdom and `src/test/setup.ts` (jest-dom); two `cn()` tests.
- shadcn CLI generated `components/ui/button.tsx`, `components.json`, theme tokens and the
  `cn` utility. The current CLI uses the `cn` package and imports `shadcn/tailwind.css`;
  this generated setup was kept as-is.

### Repository hygiene

- Root `README.md`, root `.env.example`, root `.gitignore`, `backend/.gitignore`,
  `frontend/.gitignore`, `frontend/.env.example`.
- `.env` files and `.env.*` are ignored (with `.env.example` re-included).
- No commit or push was made, as instructed.

## 4. Environment variables

Full table in [`README.md`](../../README.md#environment-variables). Summary:

| Variable | Required | Default |
| --- | --- | --- |
| `DB_URL` | no | `jdbc:mysql://localhost:3306/trainconcierge?...` |
| `DB_USER` | no | `trainconcierge` |
| `DB_PASSWORD` | **yes** | none committed |
| `JWT_SECRET` | later | empty |
| `JWT_EXPIRY_MINUTES` | no | `60` |
| `MAIL_HOST` / `MAIL_PORT` | no | `localhost` / `1025` |
| `MAIL_USER` / `MAIL_PASSWORD` | no | empty |
| `MAIL_STARTTLS` | no | `false` |
| `APP_FRONTEND_ORIGIN` | no | `http://localhost:5173` |
| `DEMO_PASSWORD` | demo profile | empty |
| `SERVER_PORT` | no | `8080` |
| `VITE_API_BASE_URL` | frontend | see `frontend/.env.example` |
| `VITE_PROXY_TARGET` | no | `http://localhost:8080` |

## 5. Commands

```bash
# Backend
cd backend
mvn clean verify
mvn spring-boot:run          # requires DB_PASSWORD

# Frontend
cd frontend
npm install
cp .env.example .env
npm run dev
npm run test
npm run build
```

Ports 8080 and 5173 were already occupied on this machine by an unrelated application, so
the live checks below used 8081/5174 with temporary command-line overrides. The committed
defaults remain 8080/5173.

## 6. Verification results

| Criterion | Result | Evidence |
| --- | --- | --- |
| `mvn clean verify` | **PASS** | 4 tests, 0 failures; jar packaged |
| `npm run build` | **PASS** | `tsc -b` clean; Vite built 2,158 modules |
| `npm run test` | **PASS** | 1 file, 2 tests |
| Backend starts | **PASS** | Dev profile with Hikari, Flyway and JPA; started in 10.4 s |
| `GET /api/health` | **PASS** | `HTTP 200`, body `{"status":"UP"}`, MySQL-backed |
| Flyway baseline | **PASS** | V1 applied to `trainconcierge_phase0`; `schema_info` and `flyway_schema_history` created |
| CORS allowed origin | **PASS** | `Access-Control-Allow-Origin: http://localhost:5174` on GET and preflight |
| CORS foreign origin | **PASS** | Preflight from `http://evil.example` → `403` |
| Frontend reaches backend | **PASS** | Badge showed `API UP`; XHR to `/api/health` 200; no console errors |
| No secrets in repo | **PASS** | Only placeholder `.env.example` files; `.env` ignored/absent |
| Audit written | **PASS** | This document |

Screenshot capture was unavailable because the in-app browser had no visible surface
(`viewport 0x0`). The DOM was inspected via page evaluation instead: title
`TrainConcierge`, the hero rendered, the badge read `API UP`, and a direct fetch to
`http://localhost:8081/api/health` returned `{"status":"UP"}`.

## 7. Live MySQL verification

Performed against the local MySQL 8.0.46 server. Because the required `trainconcierge`
schema is occupied (see section 8), a dedicated schema and user were created:

- Schema: `trainconcierge_phase0`, `utf8mb4` / `utf8mb4_0900_ai_ci`
- User: `trainconcierge_phase0` (`localhost` and `127.0.0.1`), granted only on that schema
- Password: local-only, not recorded in this repository

Startup command:

```bash
cd backend
DB_URL='jdbc:mysql://localhost:3306/trainconcierge_phase0?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC' \
DB_USER=trainconcierge_phase0 \
DB_PASSWORD='<local password>' \
APP_FRONTEND_ORIGIN=http://localhost:5174 \
SERVER_PORT=8081 \
java -jar target/trainconcierge-backend-0.0.1-SNAPSHOT.jar
```

Observed log highlights:

```text
HikariPool-1 - Start completed.
Migrating schema `trainconcierge_phase0` to version "1 - baseline"
Successfully applied 1 migration to schema `trainconcierge_phase0`, now at version v1
Started TrainConciergeApplication in 10.435 seconds
```

Observed state:

```text
GET /api/health                     -> 200 {"status":"UP"}
SHOW TABLES                         -> flyway_schema_history, schema_info
SELECT * FROM schema_info           -> baseline_version = 1
flyway_schema_history               -> version 1, description "baseline", success 1
```

No Flyway warnings or errors. The MySQL `VALUES()` deprecation warning from the first run
was removed by using `INSERT IGNORE` in `V1__baseline.sql`, and the phase0 schema was
recreated so the clean run could be observed.

The frontend was then served on 5174 against this MySQL-backed backend: the dev badge
showed `API UP`, the browser XHR to `/api/health` returned 200, and there were no console
errors or warnings.

## 8. Database conflict

The prerequisite schema name `trainconcierge` already exists on this machine with 15
tables from another application. It was deliberately not migrated. Options for the next
step, in order of safety:

1. Keep using a dedicated schema such as `trainconcierge_phase0` via `DB_URL` (what this
   phase did).
2. Back up the existing `trainconcierge` schema, confirm it is obsolete, then recreate it
   empty and use the default `DB_URL`.
3. Point `DB_URL` at any other empty MySQL 8 schema.

Do **not** add `baseline-on-migrate` to adopt the populated schema unless its tables are
known to be compatible; that would silently record a baseline and add Flyway/schema_info
tables to shared data.

## 9. Notes and follow-ups

- `application-dev.yml` intentionally has no default for `DB_PASSWORD`; startup fails fast
  unless it is provided.
- There is no full-application context test, keeping `mvn clean verify` DB-independent.
  Add integration tests with Testcontainers in a later phase.
- Demo migrations are empty until a later phase supplies seed data.
- Phase 02 should delete `src/features/health/HealthBadge.tsx` and its usage in
  `HomePage.tsx`.
- Next phase: authentication (JWT) using the already-declared JJWT dependencies and
  `JWT_SECRET` configuration.
