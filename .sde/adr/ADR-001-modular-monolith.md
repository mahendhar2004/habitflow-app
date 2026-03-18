# ADR-001: Modular Monolith Architecture

**Date:** 2026-03-18
**Status:** Accepted
**Deciders:** Mahendhar
**Phase:** Phase 2 -- Architecture

---

## Context

HabitFlow is a habit tracking app (web + mobile) built by a solo developer targeting 100-1000 users at launch. We need to choose an architecture pattern that balances development speed, operational simplicity, and future scalability. The app has four distinct domains: authentication, habit management, offline sync, and notifications.

Key constraints:
- Solo developer -- operational burden must be minimal
- MVP timeline -- fast iteration is critical
- Offline-first mobile client -- backend is a sync target, not the primary runtime
- Estimated 100-1000 users at launch, potential growth to 10k+ within a year

---

## Decision

We will use a **Modular Monolith** architecture implemented as a single NestJS application with strictly isolated modules (Auth, Habit, Sync, Notification) and a minimal shared kernel. Each module owns its data and exposes functionality through typed interfaces only.

---

## Reasoning

1. **Single deployment unit** -- one Docker container, one process, one CI pipeline. No service mesh, no inter-service networking, no distributed tracing complexity.
2. **Module boundaries enforce clean design** -- NestJS modules with explicit exports prevent spaghetti dependencies. This is the same boundary microservices would enforce, but without the operational tax.
3. **Refactoring is cheap** -- extracting a module to a standalone service later requires only creating an HTTP/gRPC client and swapping the import. No business logic rewrite.
4. **Local function calls instead of network calls** -- no serialization overhead, no retry logic, no partial failure handling between modules.
5. **Matches the team size** -- a solo developer operating microservices is fighting infrastructure, not building product.

---

## Alternatives Considered

| Option | Pros | Cons | Rejected Because |
|--------|------|------|-----------------|
| Microservices | Independent scaling, team autonomy, polyglot | Massive ops overhead, distributed transactions, complex debugging | Solo developer -- operational cost far exceeds benefit at this scale |
| Serverless (Lambda) | Auto-scaling, pay-per-use | Cold starts, vendor lock-in, hard to test locally, 15-min execution limit | Cold start latency hurts mobile UX; offline sync requires stateful processing |
| Modular Monolith | Simple ops, fast dev, clean boundaries, easy extraction | Single point of failure, vertical scaling only | **Chosen** |
| Plain Monolith (no module boundaries) | Fastest initial development | Becomes unmaintainable quickly, hard to extract later | Lack of boundaries creates tech debt that blocks future scaling |

---

## Consequences

### Positive
- Deployment is a single `docker-compose up` (API + PostgreSQL + Redis)
- Debugging is `grep correlationId` in a single log stream
- New features ship in hours, not days (no cross-service coordination)
- TypeScript type safety across all module boundaries

### Negative / Trade-offs
- Cannot scale modules independently (e.g., sync module cannot get more CPU without scaling the whole app)
- A crash in any module takes down the entire API
- Database schema is shared at the PostgreSQL level (though logically separated by module ownership)

### Neutral
- Performance is more than sufficient for 100k users on a single process (NestJS handles ~10k req/s on a 2-core VPS)

---

## Revisit When

- Team grows beyond 3 engineers (module ownership conflicts)
- A single module requires independent horizontal scaling (e.g., sync module under heavy load)
- User base exceeds 50k and a single VPS cannot handle the load
- Deploy frequency exceeds 10x/day and independent deployment becomes valuable

---

## Implementation Notes

- Each NestJS module has its own directory: `src/modules/auth/`, `src/modules/habit/`, `src/modules/sync/`, `src/modules/notification/`
- Shared kernel lives in `src/common/` -- only guards, interceptors, filters, decorators, DTOs, and config
- No module imports another module's repository or entity directly -- only the module's exported service
- Database entities are co-located with their owning module: `src/modules/habit/entities/habit.entity.ts`
- Migrations are global (single DB) but organized by module prefix: `habit_`, `auth_`, `notif_`

---

## References

- [NestJS Module Documentation](https://docs.nestjs.com/modules)
- [Modular Monolith with DDD (Kamil Grzybek)](https://github.com/kgrzybek/modular-monolith-with-ddd)
- ADR-002 (Auth), ADR-003 (Caching)
