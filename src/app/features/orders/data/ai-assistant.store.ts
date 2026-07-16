import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, timer } from 'rxjs';
import { catchError, retry, scan, switchMap, tap } from 'rxjs/operators';

import { AI_IDLE, type AiAssistantState } from '../../../core/models';
import { toMessage } from '../../../shared/utils/id.util';
import { AiAssistantApi, type AiStreamChunk } from './ai-assistant.api';

interface AiState {
  readonly orderId: string | null;
  readonly state: AiAssistantState;
}

const MAX_RETRIES = 2;
const backoff = (attempt: number) => 500 * 2 ** (attempt - 1);

/** Folds the raw NDJSON stream into the assistant's finite-state view. */
function reduceChunk(acc: AiAssistantState, chunk: AiStreamChunk): AiAssistantState {
  if (chunk.type === 'token') {
    const partial = (acc.status === 'streaming' ? acc.partial : '') + chunk.value;
    return { status: 'streaming', partial };
  }
  return {
    status: 'success',
    suggestions: chunk.suggestions,
    summary: chunk.summary,
    receivedAt: new Date().toISOString(),
  };
}

/**
 * Drives the AI assistant for the currently focused order.
 *
 * `switchMap` guarantees that selecting a new order cancels the previous stream
 * (real request abort), preventing a late response from overwriting the current
 * one — the classic race condition. Automatic retry with exponential backoff
 * recovers from the assistant's simulated flakiness; the explicit state machine
 * means the template renders exactly one well-defined view per outcome.
 */
export const AiAssistantStore = signalStore(
  { providedIn: 'root' },
  withState<AiState>({ orderId: null, state: AI_IDLE }),
  withMethods((store) => {
    const api = inject(AiAssistantApi);

    const request = rxMethod<string>(
      pipe(
        tap((orderId) => patchState(store, { orderId, state: { status: 'loading' } })),
        switchMap((orderId) => {
          let attempts = 0;
          return api.streamSuggestions(orderId).pipe(
            scan(reduceChunk, { status: 'loading' } as AiAssistantState),
            tap((state) => patchState(store, { state })),
            retry({
              count: MAX_RETRIES,
              delay: (_err, retryCount) => {
                attempts = retryCount;
                patchState(store, { state: { status: 'loading' } });
                return timer(backoff(retryCount));
              },
            }),
            catchError((err) => {
              patchState(store, {
                state: { status: 'error', message: toMessage(err, 'AI request failed'), attempts },
              });
              return EMPTY;
            }),
          );
        }),
      ),
    );

    return {
      request,
      /** Manual retry from the error state. */
      retryNow(): void {
        const id = store.orderId();
        if (id) request(id);
      },
      clear(): void {
        patchState(store, { orderId: null, state: AI_IDLE });
      },
    };
  }),
);
