# Multi-Channel Order Management

A backend-focused order management system that normalizes marketplace orders into one internal model and processes synchronization asynchronously with Redis/Asynq.

The current engineering focus is on practical concerns such as provider boundaries, retry safety, idempotency, HTTP reliability, testing, and database consistency.

> **Current status:** Shopee synchronization is the only implemented worker adapter. Lazada and LINE Shopping are currently UI/product placeholders, not working integrations. The original Bun backend source also needs to be restored because `mco-backend/app` was accidentally committed as an unresolved Git gitlink.

## Features

- React order-management dashboard
- Bun/TypeScript API layer (source recovery currently required; see [Known Repository Issue](#known-repository-issue))
- Go background order-sync worker
- Redis + Asynq background task processing
- Provider abstraction separating marketplace-specific payloads from core sync logic
- Normalized internal order and order-item models
- Deterministic local order identifiers for retry safety
- PostgreSQL uniqueness constraints + PostgREST upserts for idempotent synchronization
- Context-aware provider HTTP requests with timeouts and non-2xx handling
- Structured worker logging
- Docker Compose local runtime
- Unit tests using fake repositories and `httptest.Server`

## Architecture

```mermaid
flowchart LR
    USER[User] --> WEB[React Dashboard]
    WEB --> API[Bun / TypeScript API]
    API --> DB[(Supabase / PostgreSQL)]
    API --> QUEUE[(Redis / Asynq)]
    QUEUE --> WORKER[Go Sync Worker]
    WORKER --> ADAPTER[OrderProvider Adapter]
    ADAPTER --> SHOPEE[Shopee API / Mock]
    WORKER --> DB

    LAZADA[Lazada - not implemented] -. future adapter .-> ADAPTER
    LINE[LINE Shopping - not implemented] -. future adapter .-> ADAPTER
```

Detailed engineering decisions are documented in [`docs/architecture.md`](docs/architecture.md).

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| API | Bun, TypeScript |
| Background processing | Go, Asynq |
| Queue | Redis |
| Database | Supabase / PostgreSQL |
| Provider HTTP | Go `net/http` |
| Local runtime | Docker Compose |

## Project Structure

```text
.
├── mco-backend/             # Bun/TypeScript API wrapper; nested app source needs recovery
├── mco-backgroundjob/       # Go marketplace synchronization worker
│   ├── domain.go            # normalized order model + deterministic IDs
│   ├── provider.go          # provider interface
│   ├── shopee_provider.go   # Shopee-specific HTTP adapter
│   ├── handler.go           # Asynq orchestration only
│   ├── repository.go        # persistence boundary
│   └── internal/            # infrastructure configuration
├── mco-frontend/frontend/   # React dashboard
├── docs/
│   ├── architecture.md
│   └── sql/
└── docker-compose.yml
```

## Order Sync Flow

1. The API enqueues an `order:sync` task in Redis/Asynq.
2. The Go worker validates task identifiers and resolves the requested marketplace provider.
3. The provider adapter lists external order IDs and fetches order details.
4. Provider-specific payloads are normalized into internal `ExternalOrder`, `Order`, and `OrderItem` models.
5. Local order IDs are deterministically derived from `(shop_id, channel, external_order_id)`.
6. The repository upserts orders and items using database uniqueness constraints.
7. Retrying the same logical sync targets the same rows rather than creating new logical orders.

## Reliability Decisions

### Provider isolation

Shopee JSON models and HTTP endpoints live inside the Shopee adapter. The task handler depends only on the `OrderProvider` interface, which keeps future marketplace integrations from leaking into core synchronization code.

### Retry-safe identity

Asynq jobs can run more than once. The worker therefore does not use a fresh random order UUID for every attempt. It derives a stable UUID from the external identity and relies on database unique constraints as the final guard.

Apply:

```text
docs/sql/001_order_sync_idempotency.sql
```

before using the refactored persistence path.

### HTTP failure handling

Provider calls use an injected `http.Client` with a timeout, `context.Context`, non-2xx checks, and contextual errors. Tests can replace the real provider with `httptest.Server`.

### Transaction boundary

Order and order-item upserts are currently separate PostgREST requests. They are idempotent at the row level but **not yet one atomic transaction**. This is documented technical debt. See [`docs/architecture.md`](docs/architecture.md) for the recommended transaction options.

## Local Development

### Worker configuration

Copy the worker environment example:

```bash
cp mco-backgroundjob/.env.example mco-backgroundjob/.env
```

Set:

```text
REDIS_ADDR
SUPABASE_URL
SUPABASE_KEY
SHOPEE_BASE_URL
```

`SHOPEE_BASE_URL` may point to a mock server during development.

### Database migration

Apply the idempotency migration to the development database:

```text
docs/sql/001_order_sync_idempotency.sql
```

### Start local services

The repository includes a root `docker-compose.yml` for the frontend, backend wrapper, Redis, and Go worker. The backend container will not be reproducible from a clean clone until the nested backend source issue below is fixed.

## Testing

For the Go worker:

```bash
cd mco-backgroundjob
go test ./...
go vet ./...
```

Tests cover retry-safe identity, payload validation, Shopee response normalization, and provider HTTP failures without calling a real marketplace API.

## Known Repository Issue

`mco-backend/app` is currently a Git tree entry with mode `160000` rather than normal source files. There is no usable `.gitmodules` mapping and the referenced nested commit is not available from another GitHub repository accessible to this account.

This likely happened because the backend directory had its own `.git` directory when it was added to the parent repository.

**Do not delete the gitlink until the original backend source has been recovered locally.** The safe recovery procedure is documented in [`docs/architecture.md`](docs/architecture.md#repository-issue-nested-backend-git-repository).

## Current Limitations

- Shopee is the only implemented worker adapter.
- Lazada and LINE Shopping are not implemented integrations yet.
- Some frontend bulk actions remain UI-only until the Bun backend source is restored and the status API can be implemented safely.
- Label generation is still incomplete/demo behavior.
- Order + order-item persistence is retry-safe but not yet atomic across both writes.
- No database integration test currently proves the PostgreSQL upsert constraints end-to-end.

## Future Improvements

1. Recover the original Bun backend source into the monorepo.
2. Implement and validate `NEW -> PACKED -> SHIPPED` on the backend.
3. Connect frontend bulk status actions to that API.
4. Move order + item persistence into one PostgreSQL transaction/RPC.
5. Add a database integration test for duplicate sync and transaction rollback.
6. Add real Lazada/LINE provider adapters only when there is a real integration target.

## Design Scope

The repository intentionally favors understandable engineering over unnecessary infrastructure. It uses a small number of explicit boundaries—provider, task handler, and repository—to support asynchronous processing, external API integration, idempotency, testability, and reliability without adding systems the current workload does not require.
