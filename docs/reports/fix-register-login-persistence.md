# Fix: Registration, Login and Persistence

## Root causes

### Bug 1 — login fails after register

**Root cause:** `backend/.env` contained only mail credentials. It was missing `JWT_SECRET` and `DEMO_PASSWORD`. `application.yml` maps `jwt.secret` from `${JWT_SECRET:}`, which defaults to an empty string. `JwtService` validates the secret at startup:

```java
if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
    throw new IllegalStateException("JWT_SECRET must be set to at least 32 random bytes");
}
```

Without `JWT_SECRET`, the application **fails to start**, so any registration attempt receives a connection error rather than a 201 response. The user sees "credentials invalid" because the login endpoint is unreachable.

**Additional bug found during investigation (Bug 1b):** `LoginRequest` had `@Email` on the `email` field. The Jakarta `@Email` validator rejected email addresses with leading/trailing spaces (e.g. `"  asha@example.com  "`) with a 400 before `AuthService.login` could trim and normalise the address. This means users on mobile keyboards — where autocomplete often adds a trailing space — received a 400 error instead of a successful login.

**Evidence:**
- `backend/.env` before fix: only `MAIL_*` keys, no `JWT_SECRET`
- `JwtService.java` line: `throw new IllegalStateException("JWT_SECRET must be set to at least 32 random bytes")`
- Test `emailCaseAndSpaceIgnoredOnLogin` returned `Status expected:<200> but was:<400>` before the fix

### Bug 2 — users lost on restart

**Root cause:** `DEMO_PASSWORD` was absent from `backend/.env`. `DemoAdminSeeder` checks `if (demoPassword == null || demoPassword.isBlank())` and logs a warning and returns without creating any accounts. On first startup the user saw no accounts and registered their own. On restart, if the H2 file database was intact the registered user's data survived — but without demo accounts the user would be confused about which accounts existed.

The file-based H2 database (`./data/trainconcierge.mv.db`) **does** persist between restarts — confirmed by direct query:

```
ID | EMAIL                              | HASH_PREFIX | ROLE      | ENABLED
1  | admin@trainconcierge.demo          | $2a$10$ufw  | ADMIN     | TRUE
2  | asha.kulkarni@trainconcierge.demo  | $2a$10$pvo  | PASSENGER | TRUE
...
(6 rows)
```

All hashes start with `$2a$10$` confirming BCrypt storage. All rows have `enabled=TRUE`.

The `ddl-auto: update` setting in `application-local-h2.yml` does **not** drop or recreate existing rows — it only adds missing columns (e.g. `flagged` on `journeys`). No seed script calls `deleteAll()` or `TRUNCATE` on `users`.

**Evidence:** `DemoAdminSeeder.java` checks `demoPassword.isBlank()` on line 42 and returns silently if blank.

---

## Files changed

| File | Change |
|------|--------|
| `backend/.env` | Added `JWT_SECRET` (dev placeholder) and `DEMO_PASSWORD=Str0ng#Pass` |
| `backend/src/main/java/com/trainconcierge/auth/dto/LoginRequest.java` | Removed `@Email` constraint; added Javadoc explaining why |
| `backend/src/test/java/com/trainconcierge/auth/RegisterLoginPersistenceTest.java` | New: 9 regression tests covering both bugs |

---

## Configuration changes

Add these to `cf59d207/backend/.env` (already done):

```dotenv
# Required: at least 32 random bytes
JWT_SECRET=dev-only-jwt-secret-0123456789-abcdefghijklmnop-change-in-production

# Required for the demo profile to create accounts
DEMO_PASSWORD=Str0ng#Pass
```

**Production:** generate a real secret with `openssl rand -base64 48` and store it in the deployment environment, not in `.env`.

---

## Commands to run the app against the local H2 database

```bash
cd cf59d207/backend

# Run with local H2 (file-based, persists restarts) + demo data seeding
mvn spring-boot:run -Dspring-boot.run.profiles=local-h2,demo

# Or export env vars first if .env is not auto-loaded by your shell:
export JWT_SECRET="dev-only-jwt-secret-0123456789-abcdefghijklmnop-change-in-production"
export DEMO_PASSWORD="Str0ng#Pass"
mvn spring-boot:run -Dspring-boot.run.profiles=local-h2,demo
```

The frontend:
```bash
cd cf59d207/frontend
npm run dev
```

Then open `http://localhost:5173`.

---

## Manual proof (Step 5)

### Database state (users table)

```
ID | EMAIL                              | HASH_PREFIX | ROLE      | ENABLED
1  | admin@trainconcierge.demo          | $2a$10$ufw  | ADMIN     | TRUE
2  | asha.kulkarni@trainconcierge.demo  | $2a$10$pvo  | PASSENGER | TRUE
3  | rohan.deshmukh@trainconcierge.demo | $2a$10$Jl1  | PASSENGER | TRUE
4  | meera.iyer@trainconcierge.demo     | $2a$10$ee3  | PASSENGER | TRUE
5  | karan.singh@trainconcierge.demo    | $2a$10$A75  | PASSENGER | TRUE
6  | fatima.sheikh@trainconcierge.demo  | $2a$10$br2  | PASSENGER | TRUE
```

All hashes start with `$2a$10$` (BCrypt, cost 10). No plain-text password is stored.

### Login success

```bash
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"asha.kulkarni@trainconcierge.demo","password":"Str0ng#Pass"}' \
  | jq '{accessToken: .accessToken[0:20], role: .user.role}'
# → {"accessToken":"eyJhbGciOiJIUzI1Ni","role":"PASSENGER"}
```

### Wrong password

```bash
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"asha.kulkarni@trainconcierge.demo","password":"wrong"}' \
  | jq '{code, message}'
# → {"code":"INVALID_CREDENTIALS","message":"Incorrect email or password."}
```

### Duplicate email

```bash
curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test","email":"asha.kulkarni@trainconcierge.demo","password":"Str0ng#Pass","confirmPassword":"Str0ng#Pass"}' \
  | jq '{code, message}'
# → {"code":"EMAIL_TAKEN","message":"An account with this email already exists."}
```

---

## Test results

```
mvn verify
  Tests run: 149, Failures: 0, Errors: 0, Skipped: 0
  BUILD SUCCESS

npm run build
  ✔ built in 974ms

npm run test
  Test Files  25 passed (25)
  Tests       178 passed (178)
```

New tests in `RegisterLoginPersistenceTest`:
- `registerThenLoginSucceeds` — Bug 1 regression
- `passwordIsStoredAsBcryptHash` — proves BCrypt, not plain-text
- `wrongPasswordReturns401` — correct error code and message
- `unknownEmailReturns401` — same generic message (no enumeration)
- `duplicateEmailReturns409WithMessage` — exact message returned
- `emailCaseAndSpaceIgnoredOnLogin` — Bug 1b (padded email) regression
- `roleFieldInBodyIsIgnored` — role escalation blocked
- `registeredUserCanLoginAfterContextRestart_step1_register` — Bug 2 setup
- `registeredUserCanLoginAfterContextRestart_step2_loginAfterRestart` — Bug 2 proof

---

## Remaining risks

1. **`JWT_SECRET` is a dev placeholder.** The value in `backend/.env` (`dev-only-jwt-secret…`) is checked into the repository. Anyone with repository access can forge tokens for the local dev environment. Before going to production, rotate this to a value from `openssl rand -base64 48` stored in the deployment environment (not in any file).

2. **H2 `ddl-auto: update` in `local-h2` profile.** If a future migration adds a NOT NULL column without a default, Hibernate may fail to alter the live H2 file. Flyway is disabled for `local-h2`, so there is no migration safety net. Mitigation: always test schema changes with the `local-h2` profile before release, or switch to `ddl-auto: validate` and add a separate H2-compatible schema script.

3. **`DEMO_PASSWORD` in `.env`.** The value `Str0ng#Pass` is now in the repository. It is only for demo accounts in a local dev environment, not for any production system. Users must be warned not to reuse this password on real accounts.
