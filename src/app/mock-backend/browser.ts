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
 *
 * The worker URL is resolved against `document.baseURI` (the <base href>)
 * instead of MSW's default `/mockServiceWorker.js`, so the app also works
 * when hosted under a sub-path — e.g. GitHub Pages at
 * `https://<user>.github.io/POS-Dashboard/` where the worker lives at
 * `/POS-Dashboard/mockServiceWorker.js`, not at the domain root.
 */
export function startMockBackend(): Promise<unknown> {
  const workerUrl = new URL('mockServiceWorker.js', document.baseURI).toString();
  return worker.start({
    serviceWorker: { url: workerUrl },
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
}
