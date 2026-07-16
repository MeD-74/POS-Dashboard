import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

import type {
  Product,
  ProductCategory,
  ProductSearchQuery,
  ProductSearchResult,
} from '../../../core/models';
import { toMessage } from '../../../shared/utils/id.util';
import { ProductsApi } from './products.api';

interface SearchState {
  readonly term: string;
  readonly categories: readonly ProductCategory[];
  readonly result: ProductSearchResult | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly recent: readonly string[];
  /** Highlighted row for keyboard navigation (-1 = none). */
  readonly activeIndex: number;
}

const DEBOUNCE_MS = 250;
const MAX_RECENT = 6;

/**
 * Advanced product search store.
 *
 * The reactive core is a single debounced, distinct, `switchMap`-ed pipeline:
 * debounce absorbs keystrokes, `distinctUntilChanged` drops no-op queries, and
 * `switchMap` cancels the previous in-flight request so only the latest result
 * can ever win (no race, no flicker of stale data).
 */
export const SearchStore = signalStore(
  { providedIn: 'root' },
  withState<SearchState>({
    term: '',
    categories: [],
    result: null,
    loading: false,
    error: null,
    recent: [],
    activeIndex: -1,
  }),

  withComputed((store) => ({
    items: computed<readonly Product[]>(() => store.result()?.items ?? []),
    hasQuery: computed(() => store.term().trim().length > 0 || store.categories().length > 0),
    resultCount: computed(() => store.result()?.total ?? 0),
    isEmpty: computed(
      () => !store.loading() && (store.result()?.items.length ?? 0) === 0 && store.term().length > 0,
    ),
  })),

  withMethods((store) => {
    const api = inject(ProductsApi);

    const runSearch = rxMethod<ProductSearchQuery>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        debounceTime(DEBOUNCE_MS),
        distinctUntilChanged(
          (a, b) => a.term === b.term && a.categories.join() === b.categories.join(),
        ),
        switchMap((query) =>
          api.search(query).pipe(
            tap((result) => patchState(store, { result, loading: false, activeIndex: -1 })),
            catchError((err) => {
              patchState(store, { loading: false, error: toMessage(err, 'Search failed') });
              return EMPTY;
            }),
          ),
        ),
      ),
    );

    const currentQuery = (): ProductSearchQuery => ({
      term: store.term(),
      categories: [...store.categories()],
    });

    return {
      setTerm(term: string): void {
        patchState(store, { term });
        runSearch(currentQuery());
      },

      toggleCategory(category: ProductCategory): void {
        const set = new Set(store.categories());
        set.has(category) ? set.delete(category) : set.add(category);
        patchState(store, { categories: [...set] });
        runSearch(currentQuery());
      },

      /** Persist a term into recent history (on Enter / result selection). */
      commitRecent(term = store.term()): void {
        const trimmed = term.trim();
        if (!trimmed) return;
        const recent = [trimmed, ...store.recent().filter((r) => r !== trimmed)].slice(0, MAX_RECENT);
        patchState(store, { recent });
      },

      applyRecent(term: string): void {
        patchState(store, { term });
        runSearch(currentQuery());
      },

      // ---- keyboard navigation --------------------------------------------
      moveActive(delta: number): void {
        const count = store.result()?.items.length ?? 0;
        if (!count) return;
        const next = (store.activeIndex() + delta + count) % count;
        patchState(store, { activeIndex: next });
      },
      setActive(index: number): void {
        patchState(store, { activeIndex: index });
      },

      clear(): void {
        patchState(store, { term: '', categories: [], result: null, activeIndex: -1, error: null });
      },
    };
  }),
);
