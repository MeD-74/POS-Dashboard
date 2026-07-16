import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import type { KitchenLoad, Order, OrderStatus } from '../../../core/models';
import { environment } from '../../../../environments/environment';

/**
 * Thin, typed transport layer for order operations. Contains *no* business
 * logic — it only knows URLs, payload shapes, and how to unwrap envelopes.
 * The store orchestrates; this just talks HTTP.
 */
@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getOrders(): Observable<Order[]> {
    return this.http
      .get<{ orders: Order[] }>(`${this.base}/orders`)
      .pipe(map((res) => res.orders));
  }

  getKitchenLoad(): Observable<KitchenLoad> {
    return this.http.get<KitchenLoad>(`${this.base}/kitchen/load`);
  }

  advance(orderId: string, idempotencyKey: string): Observable<Order> {
    return this.http
      .post<{ order: Order }>(
        `${this.base}/orders/${orderId}/advance`,
        {},
        { headers: this.mutationHeaders(idempotencyKey), context: new HttpContext() },
      )
      .pipe(map((res) => res.order));
  }

  setStatus(orderId: string, status: OrderStatus, idempotencyKey: string): Observable<Order> {
    return this.http
      .post<{ order: Order }>(
        `${this.base}/orders/${orderId}/status`,
        { status },
        { headers: this.mutationHeaders(idempotencyKey) },
      )
      .pipe(map((res) => res.order));
  }

  /**
   * `X-Retryable` opts the mutation into the transport retry policy; the
   * idempotency key lets the server dedupe a retried/replayed write.
   */
  private mutationHeaders(idempotencyKey: string): Record<string, string> {
    return { 'X-Retryable': '1', 'X-Idempotency-Key': idempotencyKey };
  }
}
