import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

/**
 * Start the MSW mock backend *before* bootstrapping Angular so the very first
 * HTTP request (e.g. the initial orders load) is already intercepted.
 *
 * Gated behind `environment.useMockBackend` and dynamically imported, so its
 * (dev-only) weight lands in a separate chunk and never bloats the initial
 * bundle. A production build with the flag off drops this entire tree.
 */
async function bootstrap(): Promise<void> {
  if (environment.useMockBackend) {
    const { startMockBackend } = await import('./app/mock-backend/browser');
    await startMockBackend();
  }
  await bootstrapApplication(App, appConfig);
}

bootstrap().catch((err) => console.error(err));
