# ADR-003: Redis Caching and Rate Limiting Strategy

**Date:** 2026-03-18
**Status:** Accepted
**Deciders:** Mahendhar
**Phase:** Phase 2 -- Architecture

---

## Context

HabitFlow's API must meet p95 < 200ms response times for all authenticated endpoints, while serving a mobile client that makes frequent reads (dashboard load, streak checks, heatmap renders). The app also needs:
- Rate limiting on auth endpoints to prevent brute-force attacks
- Rate limiting on sync endpoints to prevent abuse
- A token blacklist for immediate access token revocation on logout
- Caching of computed data (streaks, heatmaps, stats) that are read-heavy but write-infrequent

At MVP scale (100-1000 users), PostgreSQL alone could handle the load. However, adding Redis now avoids a painful retrofit later and provides rate limiting and token blacklist capabilities that PostgreSQL cannot efficiently serve.

---

## Decision

We will use **Redis 7 as a cache-aside store and rate limiter**, deployed as a single instance (Upstash free tier or local Redis on the VPS). Cache keys follow a predictable pattern, TTLs are tuned per data type, and all cache reads fall back to PostgreSQL on miss.

---

## Reasoning

1. **Cache-aside is the simplest caching pattern** -- the application checks cache, queries DB on miss, and populates cache. No write-through complexity, no cache warming jobs.
2. **Redis is the de facto standard** for NestJS caching (@nestjs/cache-manager) and rate limiting (@nestjs/throttler with Redis store). No custom infrastructure needed.
3. **Streak and heatmap data is compute-heavy but stable** -- a streak requires scanning completions backward from today. Caching the result for 30 minutes eliminates repeated scans.
4. **Rate limiting requires a shared counter** -- even with a single process today, Redis-backed rate limiting is correct if we ever add a second process or load balancer.
5. **Token blacklist requires fast TTL-based expiry** -- Redis SETEX is purpose-built for this. PostgreSQL would require a cron job to clean expired entries.

---

## Alternatives Considered

| Option | Pros | Cons | Rejected Because |
|--------|------|------|-----------------|
| No cache (PostgreSQL only) | Simplest, no moving parts | Higher latency for computed queries, no token blacklist, rate limiting in-memory only | Acceptable at 100 users but painful at 1000+; rate limiting must survive restarts |
| In-memory cache (node-cache) | Zero dependencies | Lost on restart, not shared across processes | Does not support rate limiting or token blacklist correctly |
| Memcached | Fast, simple | No TTL per key, no pub/sub, less tooling | Redis is strictly more capable and equally easy to deploy |
| Redis | **Chosen** | Additional dependency | Worth it for rate limiting, token blacklist, and computed cache |

---

## Consequences

### Positive
- p95 latency for dashboard reads drops from ~80ms (DB) to ~5ms (cache hit)
- Rate limiting is persistent across API restarts
- Logout token blacklist is fast and auto-expiring
- Cache invalidation is explicit and predictable (key-based delete on write)

### Negative / Trade-offs
- Redis is an additional operational dependency. If Redis is down, the API degrades but does not fail:
  - Cache misses fall through to DB (higher latency)
  - Rate limiting falls back to in-memory (@nestjs/throttler default)
  - Token blacklist is unavailable (logged-out access tokens valid for up to 15 min)
- Cache invalidation bugs can cause stale data. Mitigated by short TTLs (5-30 min) and explicit invalidation on every write path.
- Memory usage must be monitored. At MVP scale, 50MB is more than sufficient.

### Neutral
- Redis is free at the Upstash free tier (10k commands/day). At 1000 users, this may require the $0.50/mo pay-as-you-go tier.

---

## Revisit When

- Cache hit rate drops below 60% -- may indicate TTLs are too short or invalidation is too aggressive
- Redis memory exceeds 100MB -- evaluate eviction policy or move to a larger instance
- Adding real-time features (WebSockets) -- Redis pub/sub becomes useful for event broadcasting
- Moving to multiple API instances -- Redis becomes the shared state layer (already designed for this)

---

## Implementation Notes

### Cache Key Convention
```
{scope}:{identifier}:{subkey}

Examples:
  user:abc-123:habits          -> cached habit list for user
  habit:def-456:streak         -> cached streak for habit
  habit:def-456:heatmap:2026Q1 -> cached heatmap for habit + quarter
  rate:192.168.1.1:auth/login  -> rate limit counter
  blacklist:jti:xyz-789        -> blacklisted access token
```

### Cache Service Interface
```typescript
interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPattern(pattern: string): Promise<void>;  // user:abc-123:*
}
```

### Rate Limiting Configuration
```typescript
// app.module.ts
ThrottlerModule.forRoot({
  throttlers: [
    { name: 'short', ttl: 60000, limit: 60 },    // default: 60/min
    { name: 'auth', ttl: 60000, limit: 5 },       // auth: 5/min
    { name: 'register', ttl: 3600000, limit: 10 }, // register: 10/hr
  ],
  storage: new ThrottlerStorageRedisService(redisClient),
});
```

### Graceful Degradation
```typescript
// cache.service.ts
async get<T>(key: string): Promise<T | null> {
  try {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    this.logger.warn('Redis unavailable, falling through to DB', { key, error: error.message });
    return null; // cache miss -> DB fallback
  }
}
```

### TTL Reference

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Habit list | 5 min | Frequently mutated (create, edit, reorder) |
| Today's completions | 10 min | Changes throughout the day |
| Streak data | 30 min | Changes at most once per day per habit |
| Heatmap data | 1 hr | Historical data, rarely changes |
| Monthly stats | 1 hr | Aggregated, changes slowly |
| Rate limit counters | 1 min / 1 hr | Matches rate limit window |
| Token blacklist | 15 min | Matches access token TTL |

---

## References

- [NestJS Caching](https://docs.nestjs.com/techniques/caching)
- [NestJS Throttler](https://docs.nestjs.com/security/rate-limiting)
- [Upstash Redis](https://upstash.com/)
- ADR-001 (Architecture), ADR-002 (Auth -- token blacklist)
