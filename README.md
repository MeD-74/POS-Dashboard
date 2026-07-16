# 🍔 Sahm POS — Smart Order Workspace

A production-grade **Angular 21** frontend architecture for a real-time restaurant POS.
Cashiers, branch managers, and kitchen staff share one workspace that continuously
receives live order updates, AI recommendations, and kitchen-load signals — while
staying fast, resilient, and offline-tolerant.

> This project deliberately optimises for **frontend engineering** — architecture,
> reactive data flow, state management, performance, and resilience — not visual design.

---

## ✨ What's implemented

| Module | Highlights |
| --- | --- |
| **Live Orders Workspace** | Kanban board by status, live realtime updates (simulated WebSocket + polling), optimistic status transitions, priority badges that recompute from kitchen load. |
| **AI Order Assistant** | Streaming (token-by-token) suggestions via an explicit state machine — `idle → loading → streaming → success \| error` — with automatic retry + backoff, request cancellation, and manual retry. |
| **Kitchen Load Monitor** | Live utilisation gauge pushed over realtime; drives order priority recalculation without a refresh. |
| **Advanced Product Search** | Debounced, cancellable search over 400 products, keyboard navigation, category filters, recent searches, match highlighting, and CDK **virtual scrolling** for large result sets. |
| **Offline Support** | Durable command outbox, optimistic updates, automatic replay on reconnect, idempotency keys, and duplicate-action prevention. |

---

## 🏛️ Architecture

### Layered, feature-based structure

```
src/app/
├── core/                     # Cross-cutting singletons & contracts (no UI)
│   ├── models/               # Framework-agnostic domain types + pure logic
│   ├── interceptors/         # HTTP retry/backoff policy
│   ├── offline/              # ConnectionService (connectivity source of truth)
│   └── realtime/             # RealtimeGateway abstraction (DI token)
│
├── mock-backend/             # Simulated backend (swappable, dev-only)
│   ├── data/                 # Deterministic seed data + tiny PRNG (no faker)
│   ├── server/               # In-memory DB — single source of truth
│   ├── handlers/             # MSW REST handlers (orders, AI stream, products)
│   ├── realtime/             # MockRealtimeGateway (simulated WebSocket)
│   └── browser.ts            # MSW worker bootstrap
│
├── shared/                   # Reusable, presentation-only building blocks
│   ├── ui/                   # Badge, Skeleton, EmptyState, ErrorState
│   ├── pipes/                # highlight, timeAgo
│   └── utils/                # id / error helpers
│
└── features/                 # Vertical slices, lazily loaded
    ├── orders/
    │   ├── data/             # api services + SignalStores (business logic)
    │   ├── components/       # dumb presentational components
    │   └── pages/            # smart container (orders-workspace)
    └── search/
        ├── data/
        └── pages/
```

**Dependency rule:** `features → shared → core`. The mock backend depends on `core`
contracts, never the reverse. Nothing outside `data/` folders talks to HTTP.

### Smart vs. presentational split

- **Smart containers** (`pages/`) inject stores, hold view-local UI state (e.g. the
  selected order), and translate user events into store intents. They own no business logic.
- **Presentational components** (`components/`, `shared/ui/`) take `input()`s and emit
  `output()`s. They are pure, `OnPush`, and trivially testable — an `OrderCard` never
  imports a store.

### Clean transport boundary

Every feature has an `*.api.ts` that knows only URLs and payload shapes. Stores
orchestrate; APIs just talk HTTP. The realtime channel sits behind an abstract
`RealtimeGateway` — swapping the mock for a real socket is a **one-line provider change**
in `app.config.ts`.

---

## 🧠 State management

**Choice: [NgRx SignalStore](https://ngrx.io/guide/signals) + RxJS**, on top of Angular's
**zoneless** change detection.

### Why this combination

The brief's hard requirements are *live updates, concurrent async events, scalable state,
and no unnecessary re-renders*. That points to two complementary tools:

- **Signals / SignalStore** for **state** — synchronous, glitch-free, fine-grained
  reactivity. Components read `computed` signals, so only the columns that actually change
  re-render. No `async` pipe soup, no manual `OnPush` juggling.
- **RxJS** for **events over time** — debouncing, `switchMap` cancellation, retry/backoff,
  merging the realtime stream. These are exactly what Observables are best at.

`rxMethod` from `@ngrx/signals/rxjs-interop` is the bridge: an RxJS pipeline whose results
`patchState` into signals, with subscription lifecycle tied to the store.

### Why not classic NgRx Store?

For a workspace of this size, actions/reducers/effects/selectors would add significant
boilerplate for little gain. SignalStore gives the same disciplined, testable,
unidirectional flow with a fraction of the ceremony — and aligns with where Angular is
heading. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full trade-off table.

### The three stores

| Store | Owns |
| --- | --- |
| `OrdersStore` (`withEntities`) | Order collection, board columns (`computed`), kitchen load, optimistic mutations, offline outbox, realtime merge. |
| `AiAssistantStore` | The assistant's finite state machine for the focused order; streaming, retry, cancellation. |
| `SearchStore` | Debounced query pipeline, results, recent history, keyboard selection. |

---

## ⚙️ Engineering challenges — where each is solved

| Challenge | Where / How |
| --- | --- |
| **Concurrent requests** | `mergeMap` dispatches commands for *different* orders in parallel. |
| **Request cancellation** | `switchMap` in search + AI aborts superseded requests; the AI/search fetch wires unsubscribe → `AbortController.abort()`. |
| **Race conditions** | Per-order in-flight guard in `OrdersStore.advance`; `switchMap` guarantees only the latest search/AI result wins. |
| **Optimistic updates** | `advance()` patches the entity immediately, then confirms or rolls back. |
| **Retry strategies** | Transport-level exponential backoff + jitter (`retry.interceptor.ts`); assistant-level retry with attempt tracking (`AiAssistantStore`). |
| **Error recovery** | Non-transient (4xx) fail fast; transient (5xx/429/network) retried; optimistic changes roll back on genuine rejection. |
| **Caching** | `ProductsApi` caches search responses by normalised query via `shareReplay` — dedupes concurrent identical requests and serves repeated queries with zero network traffic; failed queries are evicted. |
| **Offline** | Command outbox holds mutations offline; auto-replays on reconnect; idempotency keys prevent double-apply. |
| **Memory-leak prevention** | `takeUntilDestroyed`, `rxMethod` (auto-unsubscribe), single `share()`d realtime source, `gateway.disconnect()` in `onDestroy`. |
| **Efficient change detection** | Zoneless + signals: no Zone.js "check everything"; `computed` columns re-render granularly. |
| **Preventing unnecessary renders** | Pure `OnPush` presentational components keyed by `track`; derived state via `computed`. |

---

## 🚀 Performance optimisations

- **Zoneless change detection** — CD is driven by signals only, eliminating Zone.js's
  global change-detection passes on every async event.
- **Route-level code splitting** — each feature is a lazily-loaded standalone component;
  the initial bundle is ~**83 KB** transfer (MSW/mock backend live in a separate dev-only chunk).
- **CDK virtual scrolling** — a 200-row search result mounts ~15 DOM nodes.
- **Debounce + `distinctUntilChanged` + `switchMap`** — the search hits the network once
  per settled query, never for stale keystrokes.
- **Search response caching** — repeated/concurrent queries resolve from a `shareReplay` cache instead of re-hitting the network.
- **`computed` derivations** — board columns, counts, and priorities are memoised.
- **Pure pipes** — `highlight` and `timeAgo` are memoised by Angular and produce structured
  data (no `innerHTML`, no XSS surface).
- **Dropped `faker`** — replaced with a ~40-line seeded PRNG, removing a heavy dependency
  from the runtime path.

---

## 🧪 Testing

**43 unit tests** (Vitest, Angular 21's default runner) covering the highest-risk logic:

```bash
npm test            # single run
```

| Area | Spec |
| --- | --- |
| Order lifecycle (pure) | `core/models/order.model.spec.ts` |
| Kitchen priority derivation (pure) | `core/models/kitchen.model.spec.ts` |
| Search store (debounce, switchMap, distinct, recent, keyboard) | `features/search/data/search.store.spec.ts` |
| Search caching (dedupe, cache hit, error eviction) | `features/search/data/products.api.spec.ts` |
| Orders store (optimistic, rollback, offline queue, reconnect replay, dedup) | `features/orders/data/orders.store.spec.ts` |
| AI assistant (state transitions, retry, recovery) | `features/orders/data/ai-assistant.store.spec.ts` |
| Order card component (rendering, outputs, urgent/terminal states) | `features/orders/components/order-card.spec.ts` |
| Pipes | `shared/pipes/*.spec.ts` |
| App shell | `app.spec.ts` |

Business logic is unit-tested in isolation with mocked APIs/gateways — no reliance on the
mock backend, so tests are fast and deterministic.

---

## 🛰️ Mock backend

The simulation is a first-class part of the app (the brief evaluates its quality):

- **MSW** intercepts real `fetch` requests, so the interceptor, retry, cancellation, and
  streaming code paths all run against genuine network semantics.
- A single **in-memory DB** is the source of truth shared by REST handlers and the realtime
  gateway, keeping live updates perfectly consistent.
- **Realtime** is a simulated WebSocket: `MockRealtimeGateway` drives a clock that mutates
  the DB and multicasts `order-created` / `order-updated` / `kitchen-load` events.
- The **AI endpoint streams NDJSON** token chunks (with a ~25% simulated failure rate) to
  exercise streaming, retry, and cancellation.
- Mutations fail ~15% of the time to exercise rollback/recovery.

REST surface is documented in [`api-collection.postman.json`](./api-collection.postman.json)
(import into Postman or Bruno). See [`docs/API.md`](./docs/API.md).

> ⚠️ The mock API lives inside the browser via an MSW service worker, so requests only
> resolve while the app is running at `http://localhost:4200`. The collection documents the
> contract; run it against the open app tab (or use it as a reference).

---

## 🏃 Getting started

**Prerequisites:** Node ≥ 20, npm ≥ 10.

```bash
npm install
npm start          # dev server → http://localhost:4200
npm test           # run unit tests
npm run build      # production build
```

No external services are required — the mock backend starts automatically before the app
bootstraps.

### Environment configuration

`src/environments/environment.ts` (dev) and `environment.production.ts` (swapped in via
`angular.json` `fileReplacements` on production builds) expose:

| Flag | Purpose |
| --- | --- |
| `useMockBackend` | Gates the MSW mock backend + realtime simulation. Set to `false` and swap the `RealtimeGateway` provider to point at real services. |
| `apiBaseUrl` | Single source for every API service's base URL. |

---

## 📐 Assumptions

- The mock backend **is** the backend for this exercise; in production the `RealtimeGateway`
  provider and MSW startup are swapped/removed and the app talks to real services.
- Priority is a **derived** read-model value (never user-editable).
- Offline persistence is in-memory for the demo; the outbox is structured to move to
  IndexedDB/`localStorage` with no API change (see below).

## ⚠️ Known limitations

- The offline outbox is not yet persisted across a full page reload (kept in the store).
- No real authentication/authorisation or multi-branch scoping.
- AI suggestions are rule-based simulations, not a real model.
- i18n/RTL scaffolding is not included.

## 🔭 Future improvements

- Persist the outbox to **IndexedDB** for true cross-reload durability.
- Add **integration/component tests** with Testing Library and Playwright E2E.
- Extract `shared/ui` into a publishable component library with Storybook.
- Add server-driven pagination + result caching keyed by query.
- Introduce a feature-flag layer and error-reporting/telemetry.
- Full RTL + Arabic localisation for the target market.

---

## 📄 Further reading

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — deep dive, diagrams, trade-offs, scaling to hundreds of screens.
- [`AI_USAGE.md`](./AI_USAGE.md) — full disclosure of AI tooling used (per challenge policy).
- [`docs/API.md`](./docs/API.md) — mock API reference.
