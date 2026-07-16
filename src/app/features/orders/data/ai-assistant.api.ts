import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { AiSuggestion } from '../../../core/models';
import { environment } from '../../../../environments/environment';

export type AiStreamChunk =
  | { readonly type: 'token'; readonly value: string }
  | { readonly type: 'result'; readonly suggestions: AiSuggestion[]; readonly summary: string };

/**
 * Streaming transport for the AI assistant.
 *
 * Uses the fetch Streams API directly (rather than HttpClient) because we need
 * to surface partial tokens as they arrive. The returned Observable wires
 * unsubscription to `AbortController.abort()`, so cancelling the stream — e.g.
 * `switchMap` superseding it when the user selects another order — genuinely
 * aborts the in-flight request instead of leaking it.
 */
@Injectable({ providedIn: 'root' })
export class AiAssistantApi {
  streamSuggestions(orderId: string): Observable<AiStreamChunk> {
    return new Observable<AiStreamChunk>((subscriber) => {
      const controller = new AbortController();

      (async () => {
        try {
          const res = await fetch(`${environment.apiBaseUrl}/orders/${orderId}/ai`, {
            signal: controller.signal,
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.message ?? `AI request failed (${res.status})`);
          }
          if (!res.body) throw new Error('AI stream unavailable');

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // NDJSON: emit each complete line as it arrives.
            let newline: number;
            while ((newline = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, newline).trim();
              buffer = buffer.slice(newline + 1);
              if (line) subscriber.next(JSON.parse(line) as AiStreamChunk);
            }
          }
          subscriber.complete();
        } catch (err) {
          if (controller.signal.aborted) {
            subscriber.complete(); // cancellation is not an error
          } else {
            subscriber.error(err);
          }
        }
      })();

      return () => controller.abort();
    });
  }
}
