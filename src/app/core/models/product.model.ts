/**
 * Domain model for the Advanced Product Search.
 */

export type ProductCategory =
  | 'burgers'
  | 'pizza'
  | 'sides'
  | 'drinks'
  | 'desserts'
  | 'salads'
  | 'breakfast';

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly category: ProductCategory;
  readonly price: number;
  readonly available: boolean;
  readonly allergens: readonly string[];
  /** Popularity score used to rank equally-relevant search hits. */
  readonly popularity: number;
}

export interface ProductSearchQuery {
  readonly term: string;
  readonly categories: readonly ProductCategory[];
}

export interface ProductSearchResult {
  readonly items: readonly Product[];
  readonly total: number;
  readonly term: string;
  readonly took: number; // ms, for the "fast search" UX affordance
}

export const PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  'burgers',
  'pizza',
  'sides',
  'drinks',
  'desserts',
  'salads',
  'breakfast',
] as const;
