import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty" role="status">
      <div class="icon" aria-hidden="true">{{ icon() }}</div>
      <p class="title">{{ title() }}</p>
      @if (hint()) {
        <p class="hint">{{ hint() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: [
    `
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 32px 16px;
        text-align: center;
        color: var(--text-muted);
      }
      .icon {
        font-size: 32px;
      }
      .title {
        margin: 0;
        font-weight: 600;
        color: var(--text);
      }
      .hint {
        margin: 0;
        font-size: 13px;
      }
    `,
  ],
})
export class EmptyState {
  readonly icon = input('📭');
  readonly title = input('Nothing here yet');
  readonly hint = input('');
}
