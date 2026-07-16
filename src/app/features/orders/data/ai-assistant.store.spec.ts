import { TestBed } from '@angular/core/testing';
import { Observable, defer, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiAssistantStore } from './ai-assistant.store';
import { AiAssistantApi, type AiStreamChunk } from './ai-assistant.api';

function streamOf(...chunks: AiStreamChunk[]): Observable<AiStreamChunk> {
  return of(...chunks);
}

const successChunks: AiStreamChunk[] = [
  { type: 'token', value: 'Reviewing ' },
  { type: 'token', value: 'order.' },
  {
    type: 'result',
    suggestions: [{ kind: 'upsell', severity: 'info', title: 'Add a drink', detail: '...' }],
    summary: 'Reviewing order.',
  },
];

describe('AiAssistantStore', () => {
  let api: { streamSuggestions: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { streamSuggestions: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: AiAssistantApi, useValue: api }],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('transitions to success and exposes suggestions', () => {
    api.streamSuggestions.mockReturnValue(streamOf(...successChunks));
    const store = TestBed.inject(AiAssistantStore);

    store.request('order-1');

    const state = store.state();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.suggestions.length).toBe(1);
      expect(state.summary).toBe('Reviewing order.');
    }
  });

  // Real timers here: the store's retry uses RxJS `timer` backoff, which vitest's
  // fake clock doesn't drive reliably. Backoffs sum to ~1.5s, so a short real wait
  // is enough and keeps the assertion honest.
  const settle = () => new Promise((r) => setTimeout(r, 2500));

  it('retries on failure then lands in the error state', async () => {
    // `retry` resubscribes the returned cold observable, mirroring the real API
    // (which re-runs fetch on each subscribe). `defer` counts those subscriptions.
    let subscribes = 0;
    api.streamSuggestions.mockReturnValue(
      defer(() => {
        subscribes++;
        return throwError(() => new Error('boom'));
      }),
    );
    const store = TestBed.inject(AiAssistantStore);

    store.request('order-1');
    await settle();

    const state = store.state();
    expect(state.status).toBe('error');
    if (state.status === 'error') {
      expect(state.attempts).toBe(2);
    }
    expect(subscribes).toBe(3); // initial attempt + 2 retries
  });

  it('recovers when a retry eventually succeeds', async () => {
    let subscribes = 0;
    api.streamSuggestions.mockReturnValue(
      defer(() => (subscribes++ === 0 ? throwError(() => new Error('boom')) : streamOf(...successChunks))),
    );
    const store = TestBed.inject(AiAssistantStore);

    store.request('order-1');
    await settle();

    expect(store.state().status).toBe('success');
  });

  it('clear() returns to idle', () => {
    api.streamSuggestions.mockReturnValue(streamOf(...successChunks));
    const store = TestBed.inject(AiAssistantStore);
    store.request('order-1');

    store.clear();

    expect(store.state().status).toBe('idle');
    expect(store.orderId()).toBeNull();
  });
});
