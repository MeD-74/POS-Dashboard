import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Generic pill badge. The caller passes a CSS colour (usually a design token
 * like `var(--preparing)`); the badge derives a tinted background from it, so
 * status/priority/channel badges all share one primitive.
 */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [style.--c]="color()"><ng-content /></span>`,
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 9px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        color: var(--c, var(--text-muted));
        background: color-mix(in srgb, var(--c, var(--border)) 14%, transparent);
        border: 1px solid color-mix(in srgb, var(--c, var(--border)) 30%, transparent);
        white-space: nowrap;
      }
    `,
  ],
})
export class Badge {
  readonly color = input<string>('var(--text-muted)');
}
