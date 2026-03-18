# ADR-002: JWT Authentication with Refresh Token Rotation

**Date:** 2026-03-18
**Status:** Accepted
**Deciders:** Mahendhar
**Phase:** Phase 2 -- Architecture

---

## Context

HabitFlow requires user authentication for a mobile-first app with offline capability. Requirements:
- Email/password authentication (no OAuth in MVP)
- Stateless API authentication (horizontal scaling readiness)
- Token storage on mobile must be secure (expo-secure-store, not AsyncStorage)
- Users should stay logged in for up to 30 days without re-entering credentials
- Access tokens must expire quickly (15 min) to limit blast radius of token theft
- Refresh tokens must be rotatable to detect and prevent token replay attacks

---

## Decision

We will use **JWT access tokens (15-minute TTL, HS256) combined with opaque refresh tokens (30-day TTL) stored as SHA-256 hashes in PostgreSQL, with single-use rotation and token family tracking for reuse detection**.

Authentication is implemented via Passport.js with `passport-jwt` and `passport-local` strategies inside a dedicated NestJS Auth Module.

---

## Reasoning

1. **JWT for access tokens** -- stateless verification, no DB lookup per request. The API can validate tokens using only the signing secret. This is critical for p95 < 200ms response times.
2. **Short-lived access tokens (15 min)** -- limits the window of exploitation if an access token is stolen. Even without a blacklist, the token becomes useless in 15 minutes.
3. **Opaque refresh tokens** -- not self-contained JWTs. Stored as hashed values in the database, giving the server full control to revoke them.
4. **Token family tracking** -- each refresh token belongs to a "family" (UUID). When a refresh token is used, the old one is revoked and a new one issued in the same family. If a revoked token is reused (indicating theft), the entire family is revoked.
5. **Bcrypt-12 for password hashing** -- industry standard, resistant to GPU brute-force at 12 rounds.
6. **expo-secure-store** -- uses iOS Keychain and Android Keystore, encrypted at rest, not accessible to other apps.

---

## Alternatives Considered

| Option | Pros | Cons | Rejected Because |
|--------|------|------|-----------------|
| Session-based auth (cookie) | Simple, server-controlled revocation | Requires sticky sessions or session store, not great for mobile clients | Mobile apps prefer token-based auth; cookies are awkward in React Native |
| JWT-only (long-lived, no refresh) | Simpler implementation | Cannot revoke, long window of exploitation | 30-day JWT is a security risk; no revocation without a blacklist |
| JWT access + JWT refresh (both signed) | Can verify refresh without DB | Refresh token cannot be revoked without a blacklist | Opaque tokens with DB storage give us full revocation control |
| JWT access + opaque refresh + rotation | **Chosen** | Slightly more complex (DB writes on refresh) | Complexity is minimal and security benefit is significant |
| OAuth 2.0 / OpenID Connect (Auth0, etc.) | Standards-compliant, managed | Added dependency, cost, complexity | Overkill for email-only auth at MVP scale; can migrate later |

---

## Consequences

### Positive
- Access token validation is O(1) -- no DB hit per request
- Refresh token theft is detectable via reuse detection
- Token revocation is immediate for refresh tokens (DB delete)
- Access token revocation is best-effort via Redis blacklist (15-min TTL)
- Mobile token storage is secure by default (Keychain/Keystore)

### Negative / Trade-offs
- Every token refresh requires a DB write (revoke old + insert new). At 1000 users, this is negligible (~1 write/user/15min = ~67 writes/min).
- Logout does not immediately invalidate outstanding access tokens unless Redis blacklist is checked. A 15-minute window exists where a logged-out access token is still valid.
- If Redis is down, the logout blacklist is unavailable. Access tokens remain valid until natural expiry.

### Neutral
- HS256 (symmetric) is used instead of RS256 (asymmetric). Sufficient when the API is the only token consumer. Switch to RS256 if third-party services need to verify tokens.

---

## Revisit When

- Adding OAuth providers (Google, Apple Sign-In) -- will need passport strategies and token exchange logic
- Moving to microservices -- RS256 with JWKS endpoint for cross-service token verification
- User base exceeds 10k -- evaluate whether refresh token DB writes become a bottleneck (unlikely)
- Adding admin impersonation -- will need scoped tokens with `sub` and `impersonator` claims

---

## Implementation Notes

### JWT Payload (Access Token)
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "iat": 1710720000,
  "exp": 1710720900,
  "jti": "unique-token-id"
}
```

### Refresh Token Storage (PostgreSQL)
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,  -- SHA-256 hash
  family UUID NOT NULL,             -- rotation family
  is_revoked BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(family);
```

### Refresh Flow Pseudocode
```
1. Client sends refresh token
2. Server hashes token, looks up in DB
3. If not found or expired -> 401
4. If found but revoked (reuse detected):
   a. Revoke ALL tokens in this family
   b. Return 401 (force re-login)
5. If found and valid:
   a. Revoke current token
   b. Generate new access token (JWT)
   c. Generate new refresh token (random bytes)
   d. Store new refresh token hash in same family
   e. Return both tokens
```

---

## References

- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Auth0: Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
- ADR-001 (Architecture), ADR-003 (Caching -- token blacklist)
