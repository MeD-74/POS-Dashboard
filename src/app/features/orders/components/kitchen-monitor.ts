import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import type { KitchenLoad, KitchenLoadLevel } from '../../../core/models';

const LEVEL_COLOR: Record<KitchenLoadLevel, string> = {
  idle: 'var(--completed)',
  steady: 'var(--ready)',
  busy: 'var(--preparing)',
  overloaded: 'var(--cancelled)',
};

const LEVEL_LABEL: Record<KitchenLoadLevel, string> = {
  idle: 'Idle',
  steady: 'Steady',
  busy: 'Busy',
  overloaded: 'Overloaded',
};

/** Presentational live kitchen gauge. Reacts to `load` input pushed by realtime. */
@Component({
  selector: 'app-kitchen-monitor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Skeleton],
  template: `
    @if (load(); as l) {
      <div class="monitor" [style.--c]="color()">
        <div class="head">
          <span class="label">Kitchen load</span>
          <span class="level">{{ levelLabel() }}</span>
        </div>
        <div
          class="bar"
          role="progressbar"
          [attr.aria-valuenow]="l.utilization"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span class="fill" [style.width.%]="l.utilization"></span>
        </div>
        <div class="stats">
          <span>{{ l.utilization }}% used</span>
          <span>{{ l.activeTickets }} cooking</span>
          <span>+{{ l.delayMinutes }}m delay</span>
        </div>
      </div>
    } @else {
      <app-skeleton height="72px" />
    }
  `,
  styles: [
    `
      .monitor {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px 14px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
      }
      .head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
      }
      .label {
        font-weight: 700;
      }
      .level {
        font-weight: 700;
        color: var(--c);
      }
      .bar {
        height: 10px;
        border-radius: 999px;
        background: var(--surface-2);
        overflow: hidden;
      }
      .fill {
        display: block;
        height: 100%;
        background: var(--c);
        transition: width 0.4s ease;
      }
      .stats {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: var(--text-muted);
      }
    `,
  ],
})
export class KitchenMonitor {
  readonly load = input<KitchenLoad | null>(null);
  protected readonly color = computed(() =>
    this.load() ? LEVEL_COLOR[this.load()!.level] : 'var(--border)',
  );
  protected readonly levelLabel = computed(() =>
    this.load() ? LEVEL_LABEL[this.load()!.level] : '',
  );
}
