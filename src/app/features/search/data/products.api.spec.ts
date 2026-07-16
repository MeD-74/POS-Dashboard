import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProductsApi } from './products.api';
import type { ProductSearchResult } from '../../../core/models';

function result(term: string): ProductSearchResult {
  return { items: [], total: 0, term, took: 1 };
}

const isSearch = (url: string) => url.includes('/products');

describe('ProductsApi (caching)', () => {
  let api: ProductsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ProductsApi);
    http = TestBed.inject(HttpTestingController);
  });

  it('serves a repeated identical query from cache (no second request)', () => {
    const query = { term: 'cheese', categories: [] };

    let first: ProductSearchResult | undefined;
    api.search(query).subscribe((r) => (first = r));
    http.expectOne((req) => isSearch(req.url)).flush(result('cheese'));
    expect(first?.term).toBe('cheese');

    let second: ProductSearchResult | undefined;
    api.search(query).subscribe((r) => (second = r));
    http.expectNone((req) => isSearch(req.url)); // cache hit → no network
    expect(second).toBe(first); // same replayed value

    http.verify();
  });

  it('issues a fresh request for a different query', () => {
    api.search({ term: 'a', categories: [] }).subscribe();
    http.expectOne((req) => isSearch(req.url)).flush(result('a'));

    api.search({ term: 'b', categories: [] }).subscribe();
    http.expectOne((req) => isSearch(req.url)).flush(result('b'));

    http.verify();
  });

  it('evicts a failed query so a later attempt retries the network', () => {
    const query = { term: 'x', categories: [] };

    api.search(query).subscribe({ next: () => {}, error: () => {} });
    http.expectOne((req) => isSearch(req.url)).error(new ProgressEvent('error'));

    api.search(query).subscribe({ next: () => {}, error: () => {} });
    http.expectOne((req) => isSearch(req.url)).flush(result('x')); // not cached after error

    http.verify();
  });
});
