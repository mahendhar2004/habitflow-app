# Phase 2: System Architecture -- HabitFlow

**Date:** 2026-03-18
**Author:** Architect Agent (SDE Plugin)
**Status:** Accepted
**Phase:** 2 of 13

---

## 1. Architecture Pattern: Modular Monolith

**Pattern:** Modular Monolith (NestJS)
**Reasoning:** Solo developer, 100-1000 users, fast iteration priority. A modular monolith gives us module isolation with single-process deployment simplicity. Each NestJS module owns its data and communicates via typed interfaces -- modules can be extracted to microservices later if needed without rewriting business logic.

**Revisit when:** User base exceeds 50k OR team grows beyond 3 engineers OR a single module requires independent scaling.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│                                                             │
│  ┌────────────────────────┐   ┌──────────────────────────┐  │
│  │  Mobile App (Expo/RN)  │   │  (Future: Web Dashboard) │  │
│  │  - expo-sqlite+Drizzle │   │                          │  │
│  │  - expo-secure-store   │   │                          │  │
│  │  - expo-notifications  │   │                          │  │
│  └───────────┬────────────┘   └────────────┬─────────────┘  │
└──────────────┼─────────────────────────────┼────────────────┘
               │                             │
               └──────────┬──────────────────┘
                          │ HTTPS / REST (TLS 1.2+)
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                  API GATEWAY (NestJS)                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Middleware Pipeline                                  │   │
│  │  Correlation ID -> Rate Limiter -> Helmet -> Logger  │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                             │                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐   │
│  │  Auth    │  │  Habit   │  │  Sync    │  │  Notif    │   │
│  │  Module  │  │  Module  │  │  Module  │  │  Module   │   │
│  │          │  │          │  │          │  │           │   │
│  │ register │  │ CRUD     │  │ push/    │  │ schedule  │   │
│  │ login    │  │ complete │  │ pull     │  │ FCM/APNs  │   │
│  │ refresh  │  │ streak   │  │ resolve  │  │ prefs     │   │
│  │ logout   │  │ heatmap  │  │ conflict │  │           │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘   │
│       │             │             │              │           │
│  ┌────┴─────────────┴─────────────┴──────────────┴──────┐   │
│  │  Shared Kernel                                       │   │
│  │  - Guards (JWT, Roles)                               │   │
│  │  - Interceptors (Transform, Logging, Timeout)        │   │
│  │  - Filters (Global Exception)                        │   │
│  │  - DTOs (Pagination, Response Envelope)              │   │
│  │  - Config Module (env validation)                    │   │
│  └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                     DATA LAYER                              │
│                                                             │
│  ┌──────────────────┐  ┌───────────────┐                    │
│  │   PostgreSQL 15  │  │   Redis 7     │                    │
│  │   (primary DB)   │  │   (cache +    │                    │
│  │                  │  │    rate limit) │                    │
│  │  - users         │  │               │                    │
│  │  - habits        │  │  - sessions   │                    │
│  │  - completions   │  │  - streaks    │                    │
│  │  - refresh_tokens│  │  - rate limit │                    │
│  └──────────────────┘  └───────────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                  OBSERVABILITY LAYER                         │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐   │
│  │  Structured   │  │  Health       │  │  Sentry        │   │
│  │  JSON Logs    │  │  Checks      │  │  (errors)      │   │
│  │  (stdout)     │  │  /health     │  │                │   │
│  │               │  │  /health/db  │  │  unhandled     │   │
│  │  correlation  │  │  /health/    │  │  exceptions +  │   │
│  │  IDs, userId  │  │  redis       │  │  perf traces   │   │
│  └───────────────┘  └───────────────┘  └────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Component Breakdown

### 3.1 Service Responsibilities Table

| Module | Owns (Data) | Provides (API) | Depends On |
|--------|-------------|----------------|------------|
| **Auth Module** | users, refresh_tokens | register, login, refresh, logout, validate token | Config, Redis (token blacklist) |
| **Habit Module** | habits, completions | CRUD habits, log completion, streaks, heatmap, stats | Auth (user context), Redis (streak cache) |
| **Sync Module** | sync_queue (client), conflict_log | push changes, pull changes, resolve conflicts | Auth, Habit Module |
| **Notification Module** | notification_prefs | register device, update prefs, trigger push | Auth, FCM/APNs (external) |
| **Shared Kernel** | -- (no data) | Guards, Interceptors, Filters, DTOs, Config | -- |

### 3.2 Deployment Targets

| Component | Target | Notes |
|-----------|--------|-------|
| NestJS API | Single VPS (Ubuntu 22.04) or Railway/Render | Docker container, single process |
| PostgreSQL 15 | Managed (Supabase/Neon) or same VPS | Connection pooling via PgBouncer if managed |
| Redis 7 | Managed (Upstash) or same VPS | Upstash free tier sufficient at MVP scale |
| Mobile App | Expo EAS Build -> App Store + Play Store | OTA updates via expo-updates |
| Sentry | Sentry.io free tier | 5k errors/month |

---

## 4. Data Flow Diagrams

### 4.1 Standard Authenticated Request Flow

```
Client                    API Gateway                         Service              Cache         DB
  │                           │                                  │                   │           │
  │  POST /api/v1/habits      │                                  │                   │           │
  │  Authorization: Bearer ... │                                  │                   │           │
  │ ─────────────────────────> │                                  │                   │           │
  │                           │                                  │                   │           │
  │                     [Correlation ID Middleware]               │                   │           │
  │                     [Rate Limiter Check] ─────────────────────────────────────> │           │
  │                           │ <──────────────── allow/deny ──────────────────────── │           │
  │                     [Helmet Headers]                          │                   │           │
  │                     [JWT Auth Guard]                          │                   │           │
  │                       - decode token                         │                   │           │
  │                       - validate exp/iss                     │                   │           │
  │                       - attach user to req                   │                   │           │
  │                     [Validation Pipe]                         │                   │           │
  │                       - class-validator                      │                   │           │
  │                       - strip unknown fields                 │                   │           │
  │                           │                                  │                   │           │
  │                           │  habitService.create(dto, user)  │                   │           │
  │                           │ ────────────────────────────────> │                   │           │
  │                           │                                  │ INSERT habit      │           │
  │                           │                                  │ ──────────────────────────> │
  │                           │                                  │ <───── habit row ──────────── │
  │                           │                                  │                   │           │
  │                           │                                  │ invalidate cache  │           │
  │                           │                                  │ ────────────────> │           │
  │                           │                                  │                   │           │
  │                           │ <── { data: habit } ──────────── │                   │           │
  │                     [Transform Interceptor]                  │                   │           │
  │                       - wrap in response envelope            │                   │           │
  │                     [Logging Interceptor]                    │                   │           │
  │                       - log method, path, status, duration   │                   │           │
  │                           │                                  │                   │           │
  │ <── 201 { data: habit } ── │                                  │                   │           │
```

### 4.2 Offline Sync Flow

```
Mobile (offline)        Mobile (online)           Sync Module              Habit Module       DB
     │                       │                        │                        │              │
     │ [user completes       │                        │                        │              │
     │  3 habits offline]    │                        │                        │              │
     │                       │                        │                        │              │
     │ write to SQLite       │                        │                        │              │
     │ queue in sync_queue   │                        │                        │              │
     │ update local streaks  │                        │                        │              │
     │                       │                        │                        │              │
     │ .... device online .... │                        │                        │              │
     │                       │                        │                        │              │
     │                       │ POST /api/v1/sync/push │                        │              │
     │                       │ { changes: [...] }     │                        │              │
     │                       │ ──────────────────────>│                        │              │
     │                       │                        │                        │              │
     │                       │                        │ for each change:       │              │
     │                       │                        │  check conflict        │              │
     │                       │                        │  (updatedAt compare)   │              │
     │                       │                        │                        │              │
     │                       │                        │ habitService.upsert()  │              │
     │                       │                        │ ──────────────────────>│              │
     │                       │                        │                        │ UPSERT       │
     │                       │                        │                        │ ───────────> │
     │                       │                        │                        │ <─────────── │
     │                       │                        │ <───── results ────────│              │
     │                       │                        │                        │              │
     │                       │ <── { synced: 3,       │                        │              │
     │                       │      conflicts: 0,     │                        │              │
     │                       │      serverTime: ... } │                        │              │
     │                       │                        │                        │              │
     │                       │ clear sync_queue       │                        │              │
     │                       │ for synced items       │                        │              │
```

---

## 5. Auth Flow Diagrams

### 5.1 Registration Flow

```
Client                         Auth Module                    DB                Redis
  │                                │                          │                  │
  │ POST /api/v1/auth/register     │                          │                  │
  │ { email, password }            │                          │                  │
  │ ──────────────────────────────>│                          │                  │
  │                                │                          │                  │
  │                                │ validate DTO             │                  │
  │                                │ check email uniqueness   │                  │
  │                                │ ────────────────────────>│                  │
  │                                │ <── exists? no ──────────│                  │
  │                                │                          │                  │
  │                                │ hash password (bcrypt 12)│                  │
  │                                │ INSERT user              │                  │
  │                                │ ────────────────────────>│                  │
  │                                │ <── user row ────────────│                  │
  │                                │                          │                  │
  │                                │ generate accessToken     │                  │
  │                                │  (JWT, 15min, HS256)     │                  │
  │                                │ generate refreshToken    │                  │
  │                                │  (opaque, 30 days)       │                  │
  │                                │ store refresh in DB      │                  │
  │                                │ ────────────────────────>│                  │
  │                                │                          │                  │
  │ <── 201 { accessToken,         │                          │                  │
  │          refreshToken,         │                          │                  │
  │          user: { id, email } } │                          │                  │
  │                                │                          │                  │
  │ store tokens in SecureStore    │                          │                  │
```

### 5.2 Login Flow

```
Client                         Auth Module                    DB                Redis
  │                                │                          │                  │
  │ POST /api/v1/auth/login        │                          │                  │
  │ { email, password }            │                          │                  │
  │ ──────────────────────────────>│                          │                  │
  │                                │                          │                  │
  │                          [Rate Limiter: 5/min per IP]     │                  │
  │                                │                          │                  │
  │                                │ find user by email       │                  │
  │                                │ ────────────────────────>│                  │
  │                                │ <── user row ────────────│                  │
  │                                │                          │                  │
  │                                │ bcrypt.compare(password) │                  │
  │                                │  match? yes              │                  │
  │                                │                          │                  │
  │                                │ generate accessToken     │                  │
  │                                │ generate refreshToken    │                  │
  │                                │ store refresh in DB      │                  │
  │                                │ ────────────────────────>│                  │
  │                                │                          │                  │
  │ <── 200 { accessToken,         │                          │                  │
  │          refreshToken,         │                          │                  │
  │          user: { id, email } } │                          │                  │
```

### 5.3 Token Refresh Flow (Rotation)

```
Client                         Auth Module                    DB                Redis
  │                                │                          │                  │
  │ POST /api/v1/auth/refresh      │                          │                  │
  │ { refreshToken }               │                          │                  │
  │ ──────────────────────────────>│                          │                  │
  │                                │                          │                  │
  │                                │ lookup refreshToken      │                  │
  │                                │ ────────────────────────>│                  │
  │                                │ <── token row ───────────│                  │
  │                                │                          │                  │
  │                                │ check: is expired?       │                  │
  │                                │ check: is revoked?       │                  │
  │                                │                          │                  │
  │                                │ if reuse detected        │                  │
  │                                │  (token already rotated) │                  │
  │                                │  -> REVOKE ALL family    │                  │
  │                                │  -> return 401           │                  │
  │                                │                          │                  │
  │                                │ REVOKE old refreshToken  │                  │
  │                                │ generate NEW accessToken │                  │
  │                                │ generate NEW refreshToken│                  │
  │                                │ store new refresh in DB  │                  │
  │                                │ ────────────────────────>│                  │
  │                                │                          │                  │
  │ <── 200 { accessToken,         │                          │                  │
  │          refreshToken }        │                          │                  │
  │                                │                          │                  │
  │ replace tokens in SecureStore  │                          │                  │
```

**Refresh token rotation** is critical: each refresh token is single-use. If a stolen token is replayed after the legitimate client has already rotated, the server detects reuse and revokes the entire token family, forcing re-authentication.

### 5.4 Logout Flow

```
Client                         Auth Module                    DB                Redis
  │                                │                          │                  │
  │ POST /api/v1/auth/logout       │                          │                  │
  │ Authorization: Bearer ...      │                          │                  │
  │ { refreshToken }               │                          │                  │
  │ ──────────────────────────────>│                          │                  │
  │                                │                          │                  │
  │                                │ REVOKE refreshToken      │                  │
  │                                │ ────────────────────────>│                  │
  │                                │                          │                  │
  │                                │ add accessToken jti to   │                  │
  │                                │ blacklist (TTL = token   │                  │
  │                                │ remaining lifetime)      │                  │
  │                                │ ──────────────────────────────────────────>│
  │                                │                          │                  │
  │ <── 204 No Content             │                          │                  │
  │                                │                          │                  │
  │ clear SecureStore tokens       │                          │                  │
```

---

## 6. Database Design Overview

### 6.1 Entity Relationship Summary

```
users
  ├── 1:N ── habits
  │            ├── 1:N ── completions
  │            └── 1:1 ── notification_prefs
  ├── 1:N ── refresh_tokens
  └── 1:1 ── user_settings
```

### 6.2 Core Entities

| Entity | Key Columns | Notes |
|--------|-------------|-------|
| **users** | id (UUID), email (unique), passwordHash, isPremium, createdAt, updatedAt | Bounded context: Auth |
| **habits** | id (UUID), userId (FK), name, icon, color, frequency, frequencyDays[], sortOrder, isArchived, createdAt, updatedAt | Bounded context: Habit |
| **completions** | id (UUID), habitId (FK), userId (FK), completedDate (DATE), timezone, note, createdAt | Unique constraint: (habitId, completedDate). Bounded context: Habit |
| **refresh_tokens** | id (UUID), userId (FK), tokenHash, family (UUID), isRevoked, expiresAt, createdAt | Token family for rotation detection. Bounded context: Auth |
| **notification_prefs** | id (UUID), habitId (FK), userId (FK), enabled, reminderTime (TIME), createdAt, updatedAt | Bounded context: Notification |
| **user_settings** | id (UUID), userId (FK, unique), theme ('dark'/'light'), onboardingCompleted, createdAt, updatedAt | Bounded context: Auth |

### 6.3 Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| users | UNIQUE(email) | Login lookup |
| habits | (userId, isArchived) | Dashboard query |
| completions | UNIQUE(habitId, completedDate) | Idempotent upsert |
| completions | (userId, completedDate) | Daily dashboard |
| completions | (habitId, completedDate DESC) | Streak calculation, heatmap |
| refresh_tokens | (tokenHash) | Token lookup |
| refresh_tokens | (family) | Family revocation |

---

## 7. Caching Strategy

### 7.1 Cache Key Patterns and TTLs

| Cache Key Pattern | TTL | Invalidation Trigger | Purpose |
|-------------------|-----|---------------------|---------|
| `user:{userId}:habits` | 5 min | Habit CRUD, archive/unarchive | Dashboard habit list |
| `user:{userId}:today:{date}` | 10 min | Completion log/undo | Today's completion status |
| `habit:{habitId}:streak` | 30 min | Completion log, streak reset | Current + best streak |
| `habit:{habitId}:heatmap:{quarter}` | 1 hr | Completion log | 90-day heatmap data |
| `user:{userId}:stats:{month}` | 1 hr | Completion log | Monthly summary stats |
| `rate:{ip}:{endpoint}` | 1 min | Auto-expire | Rate limiting counter |
| `blacklist:jti:{tokenId}` | 15 min (=access TTL) | Auto-expire | Logout token blacklist |

### 7.2 Cache Strategy

- **Pattern:** Cache-aside (read: check cache -> miss -> query DB -> populate cache)
- **Serialization:** JSON
- **Max memory:** 50MB (sufficient for 1000 users at MVP scale)
- **Eviction policy:** allkeys-lru

### 7.3 Cache Invalidation Rules

1. **Write-through on mutations:** Any create/update/delete operation invalidates relevant cache keys synchronously before returning the response.
2. **No stale reads for auth:** Token blacklist is always checked in Redis first; DB is not the source of truth for active logout.
3. **Streak cache is warm-on-read:** Streak is computed from completions table, cached on first read, invalidated on new completion.

---

## 8. Rate Limiting Strategy

| Endpoint Category | Limit | Window | Key | Response on Exceed |
|-------------------|-------|--------|-----|-------------------|
| `POST /auth/login` | 5 | 1 min | IP | 429 + Retry-After header |
| `POST /auth/register` | 10 | 1 hr | IP | 429 + Retry-After header |
| `POST /auth/refresh` | 20 | 1 min | IP | 429 + Retry-After header |
| `POST /sync/push` | 60 | 1 min | userId | 429 + Retry-After header |
| `GET /habits/*` | 120 | 1 min | userId | 429 + Retry-After header |
| `POST /habits/*/complete` | 60 | 1 min | userId | 429 + Retry-After header |
| All other authenticated | 60 | 1 min | userId | 429 + Retry-After header |

**Implementation:** @nestjs/throttler backed by Redis (ioredis) for distributed counting. Sliding window algorithm.

---

## 9. Observability Plan

### 9.1 Structured Logging

All logs are JSON to stdout. Format:

```json
{
  "timestamp": "2026-03-18T12:00:00.000Z",
  "level": "info",
  "correlationId": "req_abc123def",
  "userId": "uuid-or-null",
  "method": "POST",
  "path": "/api/v1/habits",
  "statusCode": 201,
  "durationMs": 42,
  "message": "Request completed"
}
```

### 9.2 Health Checks

| Endpoint | Checks | Expected Response |
|----------|--------|-------------------|
| `GET /health` | App is running | 200 `{ status: "ok" }` |
| `GET /health/db` | PostgreSQL ping | 200 or 503 |
| `GET /health/redis` | Redis ping | 200 or 503 |
| `GET /health/ready` | All dependencies | 200 (all ok) or 503 (any down) |

**Implementation:** @nestjs/terminus with custom health indicators.

### 9.3 Error Tracking (Sentry)

| What | Config |
|------|--------|
| Unhandled exceptions | Auto-capture with stack trace |
| Request context | correlationId, userId, method, path |
| Performance traces | 20% sample rate (MVP) |
| Environment tags | `production`, `staging` |
| Source maps | Uploaded during CI build |
| Alert rules | 10+ errors in 5 min -> email alert |

### 9.4 Key Metrics to Track

| Metric | Type | Source |
|--------|------|--------|
| `http_request_duration_ms` | Histogram | Logging interceptor |
| `http_requests_total` | Counter | Logging interceptor |
| `auth_login_total` | Counter | Auth service |
| `auth_login_failed_total` | Counter | Auth service |
| `sync_push_total` | Counter | Sync service |
| `sync_conflicts_total` | Counter | Sync service |
| `cache_hit_total` / `cache_miss_total` | Counter | Cache service |
| `db_query_duration_ms` | Histogram | TypeORM subscriber |
| `active_users_daily` | Gauge | Scheduled job |

### 9.5 Alerting Rules (Phase 1 -- MVP)

| Alert | Condition | Channel |
|-------|-----------|---------|
| API down | Health check fails 3x in 1 min | Email |
| Error spike | >10 5xx errors in 5 min | Sentry + Email |
| DB connection pool exhausted | Available connections = 0 | Email |
| High latency | p95 > 500ms for 5 min | Email |

---

## 10. Failure Mode Analysis

### 10.1 PostgreSQL Unavailable

| Aspect | Detail |
|--------|--------|
| **Impact** | All write operations fail. Reads that miss cache fail. Auth (login/register) fails. |
| **Detection** | `/health/db` returns 503. DB query timeout logs. Sentry error spike. |
| **Mitigation** | Cache serves recent reads. Mobile app continues operating offline. |
| **Recovery** | DB reconnects automatically (TypeORM retry). No data loss -- mobile sync queue retains unsynced data. |
| **Blast radius** | Backend degraded. Mobile fully functional offline. |

### 10.2 Redis Unavailable

| Aspect | Detail |
|--------|--------|
| **Impact** | Cache misses fall through to DB (higher latency). Rate limiting disabled. Token blacklist unavailable (logout not enforced until access token expires). |
| **Detection** | `/health/redis` returns 503. Cache miss rate spikes. |
| **Mitigation** | All operations fall back to DB. Rate limiting degrades to in-memory (process-local). |
| **Recovery** | Redis reconnects automatically (ioredis retry). Cache repopulates on read. |
| **Blast radius** | Performance degraded, not broken. Security: 15-min window where logged-out tokens are still valid. |

### 10.3 Mobile Device Offline

| Aspect | Detail |
|--------|--------|
| **Impact** | No sync with backend. Push notifications may not arrive. |
| **Detection** | NetInfo listener in app. Sync module detects network state. |
| **Mitigation** | Full offline mode: SQLite stores all data. Sync queue accumulates changes. Local notifications still fire. |
| **Recovery** | On reconnect, sync module pushes queued changes. Exponential backoff: 5s, 15s, 60s, then next app open. |
| **Blast radius** | None -- app fully functional. |

### 10.4 Refresh Token Stolen

| Aspect | Detail |
|--------|--------|
| **Impact** | Attacker can generate new access tokens. |
| **Detection** | Refresh token reuse detection (token already rotated -> family revocation). |
| **Mitigation** | Token rotation: each refresh token is single-use. Reuse triggers family-wide revocation. Access tokens are short-lived (15 min). |
| **Recovery** | Legitimate user is forced to re-login. All sessions in the compromised family are invalidated. |
| **Blast radius** | Single user affected. No lateral movement possible. |

### 10.5 Sync Conflict (Multi-Device Edit)

| Aspect | Detail |
|--------|--------|
| **Impact** | Same habit edited on two devices while both offline. |
| **Detection** | Sync module compares `updatedAt` timestamps on push. |
| **Mitigation** | Last-write-wins (LWW) based on `updatedAt`. Conflict logged server-side for auditing. |
| **Recovery** | Automatic. No user intervention needed. Server timestamp is authoritative. |
| **Blast radius** | Single habit's metadata. Completions are idempotent (upsert by habitId+date) so they never conflict. |

---

## 11. API Endpoint Summary

### Auth Module

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | Public | Create account |
| POST | `/api/v1/auth/login` | Public | Login, get tokens |
| POST | `/api/v1/auth/refresh` | Public | Rotate tokens |
| POST | `/api/v1/auth/logout` | JWT | Revoke tokens |
| GET | `/api/v1/auth/me` | JWT | Get current user |

### Habit Module

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/habits` | JWT | Create habit |
| GET | `/api/v1/habits` | JWT | List user's habits |
| GET | `/api/v1/habits/:id` | JWT | Get habit detail |
| PATCH | `/api/v1/habits/:id` | JWT | Update habit |
| DELETE | `/api/v1/habits/:id` | JWT | Delete habit |
| PATCH | `/api/v1/habits/:id/archive` | JWT | Archive/unarchive |
| PATCH | `/api/v1/habits/reorder` | JWT | Reorder habits |
| POST | `/api/v1/habits/:id/complete` | JWT | Log completion for today |
| DELETE | `/api/v1/habits/:id/complete` | JWT | Undo today's completion |
| GET | `/api/v1/habits/:id/streak` | JWT | Get streak info |
| GET | `/api/v1/habits/:id/heatmap` | JWT | Get 90-day heatmap |
| GET | `/api/v1/habits/:id/stats` | JWT | Get weekly/monthly stats |

### Sync Module

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/sync/push` | JWT | Push local changes to server |
| GET | `/api/v1/sync/pull` | JWT | Pull server changes since timestamp |

### Notification Module

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/notifications/device` | JWT | Register device token |
| PATCH | `/api/v1/notifications/prefs/:habitId` | JWT | Update reminder prefs |
| GET | `/api/v1/notifications/prefs` | JWT | Get all notification prefs |

---

## 12. Technology Decisions Summary

| Decision | Choice | ADR |
|----------|--------|-----|
| Architecture pattern | Modular Monolith (NestJS) | ADR-001 |
| Authentication | JWT + Passport + Refresh Token Rotation | ADR-002 |
| Caching | Redis cache-aside with key-based invalidation | ADR-003 |
| Database ORM | TypeORM (migrations, repository pattern) | Stack constant |
| Mobile local DB | expo-sqlite + Drizzle ORM | Stack constant |
| Mobile token storage | expo-secure-store | Stack constant |
| API validation | class-validator + class-transformer | Stack constant |
| Rate limiting | @nestjs/throttler + Redis | ADR-003 |

---

## 13. Security Posture Summary

| Layer | Control |
|-------|---------|
| Transport | HTTPS only, TLS 1.2+, HSTS |
| Input | class-validator on all DTOs, strip unknown fields |
| Auth | JWT (15min) + refresh rotation (30d), bcrypt-12 |
| Token storage (mobile) | expo-secure-store (Keychain/Keystore), never AsyncStorage |
| Token storage (server) | Refresh tokens hashed (SHA-256) in DB |
| Rate limiting | Per-IP on auth, per-user on API |
| Headers | Helmet.js (CSP, X-Frame-Options, etc.) |
| SQL injection | TypeORM parameterized queries |
| Logging | Never log passwords, tokens, or PII beyond userId |
| Secrets | Environment variables, never in code |

---

## ADRs Created

- [ADR-001: Modular Monolith Architecture](./../adr/ADR-001-modular-monolith.md)
- [ADR-002: JWT Authentication with Refresh Token Rotation](./../adr/ADR-002-jwt-auth.md)
- [ADR-003: Redis Caching and Rate Limiting Strategy](./../adr/ADR-003-redis-caching.md)
