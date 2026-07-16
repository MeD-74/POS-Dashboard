import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { timer } from 'rxjs';
import { retry } from 'rxjs/operators';

/**
 * Transport-level retry policy with exponential backoff + jitter.
 *
 * Applied to every outgoing request. Only *transient* failures are retried
 * (network errors and 5xx / 429). 4xx client errors fail fast because retrying
 * them is pointless and would hide bugs. Read requests (GET) are safe to retry;
 * mutations opt in explicitly so we never double-apply a non-idempotent write
 * at the transport layer — idempotency for writes is handled by the offline
 * command queue instead.
 */
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 400;

function isTransient(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  // status 0 === network / offline error under fetch backend.
  return error.status === 0 || error.status === 429 || error.status >= 500;
}

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  const retryable = req.method === 'GET' || req.headers.has('X-Retryable');

  if (!retryable) {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: MAX_RETRIES,
      delay: (error, attempt) => {
        if (!isTransient(error)) {
          throw error; // give up immediately on non-transient failures
        }
        const backoff = BASE_DELAY_MS * 2 ** (attempt - 1);
        const jitter = Math.random() * BASE_DELAY_MS;
        return timer(backoff + jitter);
      },
    }),
  );
};
