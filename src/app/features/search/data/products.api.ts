import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import type { ProductSearchQuery, ProductSearchResult } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductsApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /**
   * In-memory response cache keyed by the normalised query.
   *
   * `shareReplay` does double duty: it dedupes *concurrent* identical requests
   * (only one goes to the network) and, with `refCount: false`, keeps the last
   * result so a *repeated* query — e.g. the user retyping a recent term or
   * toggling a filter back — resolves instantly with zero network traffic.
   * Failed requests are evicted so a transient error is never cached forever.
   */
  private readonly cache = new Map<string, Observable<ProductSearchResult>>();

  search(query: ProductSearchQuery): Observable<ProductSearchResult> {
    const key = this.cacheKey(query);
    const cached = this.cache.get(key);
    if (cached) return cached;

    let params = new HttpParams().set('term', query.term);
    for (const category of query.categories) {
      params = params.append('category', category);
    }

    const request$ = this.http.get<ProductSearchResult>(`${this.base}/products`, { params }).pipe(
      tap({ error: () => this.cache.delete(key) }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.cache.set(key, request$);
    return request$;
  }

  /** Clears the cache (e.g. after data that could change results is mutated). */
  invalidate(): void {
    this.cache.clear();
  }

  private cacheKey(query: ProductSearchQuery): string {
    return `${query.term.trim().toLowerCase()}|${[...query.categories].sort().join(',')}`;
  }
}
