import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchStore } from './search.store';
import { ProductsApi } from './products.api';
import type { Product, ProductSearchResult } from '../../../core/models';

function product(id: string, name: string): Product {
  return { id, name, category: 'burgers', price: 50, available: true, allergens: [], popularity: 1 };
}

function result(items: Product[], term: string): ProductSearchResult {
  return { items, total: items.length, term, took: 5 };
}

describe('SearchStore', () => {
  let api: { search: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    api = { search: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: ProductsApi, useValue: api }],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('debounces input and stores the result', () => {
    const items = [product('1', 'Cheeseburger')];
    api.search.mockReturnValue(of(result(items, 'chee')));
    const store = TestBed.inject(SearchStore);

    store.setTerm('chee');
    expect(store.loading()).toBe(true);
    expect(api.search).not.toHaveBeenCalled(); // still within debounce window

    vi.advanceTimersByTime(250);

    expect(api.search).toHaveBeenCalledTimes(1);
    expect(store.items().length).toBe(1);
    expect(store.loading()).toBe(false);
  });

  it('collapses rapid keystrokes into a single request (switchMap)', () => {
    api.search.mockReturnValue(of(result([], 'burger')));
    const store = TestBed.inject(SearchStore);

    store.setTerm('b');
    store.setTerm('bu');
    store.setTerm('burger');
    vi.advanceTimersByTime(250);

    expect(api.search).toHaveBeenCalledTimes(1);
    expect(api.search).toHaveBeenCalledWith({ term: 'burger', categories: [] });
  });

  it('ignores a no-op repeated query (distinctUntilChanged)', () => {
    api.search.mockReturnValue(of(result([], 'x')));
    const store = TestBed.inject(SearchStore);

    store.setTerm('x');
    vi.advanceTimersByTime(250);
    store.setTerm('x');
    vi.advanceTimersByTime(250);

    expect(api.search).toHaveBeenCalledTimes(1);
  });

  it('keeps a de-duplicated recent-search history', () => {
    const store = TestBed.inject(SearchStore);
    store.commitRecent('pizza');
    store.commitRecent('burger');
    store.commitRecent('pizza');

    expect(store.recent()).toEqual(['pizza', 'burger']);
  });

  it('wraps keyboard navigation around the result list', () => {
    api.search.mockReturnValue(of(result([product('1', 'A'), product('2', 'B')], 'a')));
    const store = TestBed.inject(SearchStore);
    store.setTerm('a');
    vi.advanceTimersByTime(250);

    store.moveActive(1);
    expect(store.activeIndex()).toBe(0);
    store.moveActive(1);
    expect(store.activeIndex()).toBe(1);
    store.moveActive(1);
    expect(store.activeIndex()).toBe(0); // wrapped
  });
});
