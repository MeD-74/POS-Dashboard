import { setupWorker } from 'msw/browser';
import { orderHandlers } from './handlers/orders.handlers';
import { aiHandlers } from './handlers/ai.handlers';
import { productHandlers } from './handlers/products.handlers';

/** MSW service worker wired with every mock REST handler. */
export const worker = setupWorker(...orderHandlers, ...aiHandlers, ...productHandlers);

/**
 * Starts the mock backend. Called before Angular bootstraps so no request can
 * escape to a real network. `onUnhandledRequest: 'bypass'` lets static assets
 * (JS chunks, fonts) through untouched.
 */
export function startMockBackend(): Promise<unknown> {
  return worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
}
