import { delay, http, HttpResponse } from 'msw';
import { db } from '../server/in-memory-db';
import type { AiSuggestion, Order } from '../../core/models';

const API = '/api';

/** The assistant is flaky on purpose so retry logic has something to recover from. */
const AI_FAILURE_RATE = 0.25;

/**
 * Streaming AI endpoint (NDJSON).
 *
 * Emits a sequence of `{"type":"token"}` chunks that build a partial narrative,
 * followed by a terminal `{"type":"result"}` chunk carrying the structured
 * suggestions. This simulates a real LLM stream: the client can render partial
 * text as it arrives and only commit the structured result at the end.
 */
export const aiHandlers = [
  http.get(`${API}/orders/:id/ai`, async ({ params, request }) => {
    const order = db.getOrder(String(params['id']));
    if (!order) {
      return HttpResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    await delay(300 + Math.random() * 400); // "thinking" time

    if (Math.random() < AI_FAILURE_RATE) {
      return HttpResponse.json({ message: 'AI assistant timed out' }, { status: 503 });
    }

    const suggestions = buildSuggestions(order, db.getKitchenLoad().level);
    const summary = buildSummary(order, suggestions);
    const tokens = summary.match(/\S+\s*/g) ?? [summary];

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        // Abort mid-stream if the client cancels (switchMap / component destroy).
        const signal = request.signal;
        for (const token of tokens) {
          if (signal.aborted) {
            controller.close();
            return;
          }
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'token', value: token }) + '\n'));
          await delay(45 + Math.random() * 55);
        }
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'result', suggestions, summary }) + '\n'),
        );
        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
  }),
];

function buildSuggestions(order: Order, load: string): AiSuggestion[] {
  const out: AiSuggestion[] = [];
  const allergens = new Set(order.items.flatMap(() => [] as string[]));

  const hasDrink = order.items.some((i) => /juice|cola|latte|water|mint/i.test(i.name));
  if (!hasDrink) {
    out.push({
      kind: 'upsell',
      severity: 'info',
      title: 'Suggest a drink',
      detail: `${order.customerName}'s order has no beverage — offer Fresh Orange Juice or Lemon Mint.`,
    });
  }

  if (order.items.some((i) => /burger|pizza/i.test(i.name))) {
    out.push({
      kind: 'allergy-warning',
      severity: 'warning',
      title: 'Possible gluten & dairy',
      detail: 'Confirm allergy preferences before sending to the kitchen.',
    });
  }

  if (!order.customerName || (order.channel === 'walk-in' && !order.tableNumber)) {
    out.push({
      kind: 'missing-info',
      severity: 'warning',
      title: 'Missing order details',
      detail: 'Table number is not set for this walk-in order.',
    });
  }

  if (order.channel === 'delivery') {
    out.push({
      kind: 'delivery-risk',
      severity: load === 'overloaded' ? 'critical' : 'info',
      title: 'Delivery timing',
      detail:
        load === 'overloaded'
          ? 'Kitchen is overloaded — delivery ETA is at risk. Notify the driver.'
          : 'Delivery order on track.',
    });
  }

  if (load === 'overloaded' || load === 'busy') {
    out.push({
      kind: 'kitchen-overload',
      severity: load === 'overloaded' ? 'critical' : 'warning',
      title: 'Kitchen under pressure',
      detail: `Kitchen load is ${load}. Consider prioritising or delaying non-urgent items.`,
    });
  }

  void allergens;
  return out;
}

function buildSummary(order: Order, suggestions: AiSuggestion[]): string {
  const lead = `Reviewing order ${order.reference} for ${order.customerName}. `;
  if (!suggestions.length) {
    return lead + 'Everything looks good — no action needed. Ready to send to the kitchen.';
  }
  const highlights = suggestions.map((s) => s.title.toLowerCase()).join(', ');
  return (
    lead +
    `I found ${suggestions.length} point(s) worth your attention: ${highlights}. ` +
    'Review the details on the right before confirming.'
  );
}
