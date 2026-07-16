import { delay, http, HttpResponse } from 'msw';
import { db } from '../server/in-memory-db';
import type { ProductCategory } from '../../core/models';

const API = '/api';

export const productHandlers = [
  /**
   * Search endpoint. Latency scales slightly with result size and the handler
   * honours request cancellation — MSW forwards the fetch AbortSignal, so a
   * superseded search (switchMap on the client) is genuinely aborted in flight.
   */
  http.get(`${API}/products`, async ({ request }) => {
    const url = new URL(request.url);
    const term = url.searchParams.get('term') ?? '';
    const categories = (url.searchParams.getAll('category') as ProductCategory[]) ?? [];

    const started = performance.now();
    await delay(120 + Math.random() * 220);

    const items = db.searchProducts(term, categories);
    return HttpResponse.json({
      // Large result set streamed to the client; the UI virtualises rendering.
      items: items.slice(0, 200),
      total: items.length,
      term,
      took: Math.round(performance.now() - started),
    });
  }),
];
