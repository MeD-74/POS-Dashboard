import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Content-shaped loading placeholder. Prefer this over a spinner for layout that
 * will be populated, so the page doesn't jump when data arrives.
 */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="sk" [style.width]="width()" [style.height]="height()" aria-hidden="true"></span>`,
  styles: [
    `
      .sk {
        display: block;
        border-radius: 6px;
        background: linear-gradient(
          90deg,
          var(--surface-2) 25%,
          var(--border) 37%,
          var(--surface-2) 63%
        );
        background-size: 400% 100%;
        animation: shimmer 1.4s ease infinite;
      }
      @keyframes shimmer {
        0% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0 50%;
        }
      }
    `,
  ],
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('16px');
}
