# Mock API Reference

All endpoints are served by [MSW](https://mswjs.io/) in the browser at the `/api` prefix.
The mock backend starts automatically before the app bootstraps (`src/main.ts`).

Two behaviours are intentionally injected to exercise resilience code paths:

- **Mutations** (`/advance`, `/status`) fail with `503` ~15% of the time.
- **AI** (`/ai`) fails with `503` ~25% of the time.

## Orders

### `GET /api/orders`
Returns the current board.
```json
{ "orders": [ { "id": "order-0", "reference": "#1234", "channel": "delivery",
  "status": "preparing", "priority": "high", "items": [ ... ], "total": 240,
  "customerName": "Sara", "createdAt": "…", "updatedAt": "…" } ] }
```

### `POST /api/orders/:id/advance`
Advances an order one step through the lifecycle
(`received → preparing → ready → delivered → completed`).

Headers:
- `X-Retryable: 1` — opts the request into the transport retry policy.
- `X-Idempotency-Key: <uuid>` — dedupe key for safe replay.

`200` → `{ "order": { ... } }` · `404` order not found · `503` transient failure.

### `POST /api/orders/:id/status`
Body: `{ "status": "ready" }`. Sets an explicit status. Same headers/semantics as `/advance`.

## Kitchen

### `GET /api/kitchen/load`
```json
{ "utilization": 72, "level": "busy", "activeTickets": 4, "delayMinutes": 4, "updatedAt": "…" }
```
Live changes are pushed over the realtime channel, not polled.

## AI Assistant

### `GET /api/orders/:id/ai`
Streams **NDJSON**. Each line is one JSON object:
```
{"type":"token","value":"Reviewing "}
{"type":"token","value":"order "}
{"type":"result","suggestions":[{"kind":"upsell","severity":"info","title":"…","detail":"…"}],"summary":"…"}
```
Honours request cancellation via the fetch `AbortSignal`.

## Products

### `GET /api/products?term=<q>&category=<c>&category=<c>`
Debounced search from the client. Matches product name **or** category.
```json
{ "items": [ { "id": "prod-1", "name": "Pepperoni Feast", "category": "pizza",
  "price": 180, "available": true, "allergens": ["gluten","dairy"], "popularity": 87 } ],
  "total": 34, "term": "chee", "took": 6 }
```
Returns up to 200 items; the client virtualises rendering.

## Realtime channel (simulated WebSocket)

Not an HTTP endpoint — delivered through `RealtimeGateway.events$`:

| Event | Payload |
| --- | --- |
| `order-created` | `{ order }` |
| `order-updated` | `{ order }` |
| `kitchen-load` | `{ load }` |
