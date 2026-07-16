import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { SearchStore } from '../data/search.store';
import { HighlightPipe } from '../../../shared/pipes/highlight.pipe';
import { Badge } from '../../../shared/ui/badge/badge';
import { EmptyState } from '../../../shared/ui/states/empty-state';
import { ErrorState } from '../../../shared/ui/states/error-state';
import { PRODUCT_CATEGORIES, type Product, type ProductCategory } from '../../../core/models';

/** Category → emoji thumbnail. Cheap, image-free way to give each result a face. */
const CATEGORY_ICON: Record<ProductCategory, string> = {
  burgers: '🍔',
  pizza: '🍕',
  sides: '🍟',
  drinks: '🥤',
  desserts: '🍰',
  salads: '🥗',
  breakfast: '🍳',
};

/**
 * Advanced Product Search page.
 *
 * A thin smart component: it forwards keyboard/pointer events to the
 * `SearchStore` (which owns the debounced, cancellable reactive pipeline) and
 * renders results through a virtual-scroll viewport so a 200-row result set
 * only ever mounts ~15 DOM nodes.
 */
@Component({
  selector: 'app-search-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScrollingModule, HighlightPipe, Badge, EmptyState, ErrorState],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss',
})
export class SearchPage {
  protected readonly store = inject(SearchStore);
  protected readonly categories = PRODUCT_CATEGORIES;

  protected onInput(event: Event): void {
    this.store.setTerm((event.target as HTMLInputElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.store.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.store.moveActive(-1);
        break;
      case 'Enter':
        this.store.commitRecent();
        break;
      case 'Escape':
        this.store.clear();
        break;
    }
  }

  protected isSelected(category: ProductCategory): boolean {
    return this.store.categories().includes(category);
  }

  protected trackById(_index: number, product: Product): string {
    return product.id;
  }

  protected icon(category: ProductCategory): string {
    return CATEGORY_ICON[category];
  }
}
