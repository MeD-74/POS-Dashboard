import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { retryInterceptor } from './core/interceptors/retry.interceptor';
import { RealtimeGateway } from './core/realtime/realtime-gateway';
import { MockRealtimeGateway } from './mock-backend/realtime/mock-realtime-gateway';

/**
 * Root application providers.
 *
 * - `provideZonelessChangeDetection` — the app runs without zone.js. Change
 *   detection is driven purely by signals, which eliminates the blanket
 *   "check everything on every async event" behaviour Zone.js causes and is the
 *   backbone of our "no unnecessary re-renders" story.
 * - `withComponentInputBinding` — route params bind straight to component
 *   inputs, keeping smart components free of manual ActivatedRoute plumbing.
 * - `withFetch` — the fetch-based HttpClient backend, required for MSW
 *   interception in the browser.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([retryInterceptor])),

    // Swap this single line for a real socket-backed gateway in production.
    { provide: RealtimeGateway, useClass: MockRealtimeGateway },
  ],
};
