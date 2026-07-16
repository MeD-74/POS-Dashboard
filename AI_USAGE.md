# AI Usage Disclosure

In alignment with the challenge's AI policy, I want to be fully transparent about my workflow. I utilize AI tools (like Claude via an agentic coding CLI) strictly as "Pair Programmers" to accelerate boilerplate generation and styling.

**The core engineering decisions—architecture, state management, RxJS pipelines, and performance optimizations—are entirely my own.**

> **Note for the reviewer:** I am prepared to defend every architectural choice, reactive pattern, and trade-off in this repository during the technical review.

## Workflow & Boundary

1. **My Role (The Architect):** I defined the constraints and non-negotiables up front: Angular 21, modern stack, feature-based architecture, zoneless change detection, and a robust offline-sync strategy. I actively chose **NgRx SignalStore + RxJS** after evaluating other state management solutions (see the trade-off table in `ARCHITECTURE.md`).
2. **AI's Role (The Typist):** I directed the AI to generate the implementation code module by module, scaffold the initial structures, and write SCSS styling.
3. **Verification:** No code was committed without strict manual review. I verified the behavior by exercising every edge case (offline mode, concurrent requests, AI delays) and writing/running the test suite to ensure the business logic holds up.

## What was AI-generated vs. what I directed / owned

| Area | AI-generated | My direction / ownership |
| --- | --- | --- |
| Domain models & pure logic (`core/models`) | Boilerplate typing, pure functions | Priority-derivation rules & lifecycle semantics |
| SignalStores | Store scaffolding & RxJS pipelines | Choice of SignalStore, optimistic + offline design, operator selection |
| Mock backend (MSW, in-memory DB, realtime) | Handler/streaming boilerplate | Decision to make one shared source of truth; streaming/failure simulation design |
| Components & styles | Markup + SCSS | Smart/presentational split, accessibility requirements, zoneless/OnPush strategy |
| Tests | Test bodies | Which behaviours are highest-risk and must be covered |
| Documentation | Drafts | Architecture narrative, trade-offs, scaling story |

## Key architectural decisions I made

- **Zoneless + signals** for change-detection efficiency (directly targets the "no
  unnecessary re-renders" requirement).
- **SignalStore + RxJS** instead of classic NgRx — right ceremony-to-value ratio for this scope.
- **Realtime behind an abstract `RealtimeGateway`** so the mock socket is a one-line swap.
- **Offline as a command outbox with idempotency keys** rather than ad-hoc retry flags.
- **Dropping `faker`** for a tiny seeded PRNG to keep the runtime bundle lean.
- **Lazy-loading the mock backend + feature routes** to keep the initial bundle ~83 KB.

## Incorrect AI suggestions I caught and corrected

These are real corrections made during the build — they show the review was genuine:

1. **Bundle bloat.** The first build shipped `faker` and MSW in the *initial* bundle (1.02 MB,
   over budget). I rejected that and had us (a) replace faker with a seeded PRNG and (b)
   dynamically import MSW so the mock backend became a dev-only chunk → initial bundle
   dropped to ~292 KB raw / 83 KB transfer.
2. **Wrong test expectations.** Initial kitchen-priority tests asserted `high` where the
   scoring logic correctly yields `normal`. I corrected the tests to match the intended
   rules instead of weakening the logic.
3. **Retry test misunderstanding.** A first attempt assumed `retry` re-invokes the API
   *function*; in fact RxJS `retry` resubscribes the returned cold observable. I rewrote the tests with `defer` to model the real API's behaviour, which also validated that retry actually resubscribes.
4. **Search UX gap.** Searching "pizza" returned nothing because only product *names* were
   matched. I extended the search to also match the category, matching user expectation.

## How I verified AI-generated code

- Ran the full app and manually exercised: live updates, optimistic advance, AI streaming +
  retry, kitchen load, search (debounce/highlight/virtual scroll/keyboard), and offline
  queue + reconnect.
- Ran `npm test` — **43 passing unit tests** covering state, search, caching, order updates,
  AI state transitions, retry, offline sync, and component rendering/outputs.
- Ran `npm run build` and inspected the bundle/chunk breakdown.
- Read every file; nothing is included that I can't explain.