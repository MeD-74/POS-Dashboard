import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { isTerminal, nextStatus, type Order } from '../../../core/models';
import { CHANNEL_ICON, CHANNEL_LABEL, STATUS_COLOR, STATUS_LABEL } from './order-visuals';

/**
 * Pure presentational order card. Knows nothing about stores or HTTP — it
 * renders an `Order` and emits user intent (`advance`, `select`). Being a pure
 * signal component with OnPush, it only re-renders when its `order` input
 * actually changes reference, not on every board update.
 */
@Component({
  selector: 'app-order-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TimeAgoPipe, DecimalPipe],
  template: `
    <article
      class="card"
      [style.--status]="statusColor()"
      [class.pending]="order().pending"
      [class.urgent]="isUrgent()"
      tabindex="0"
      role="button"
      [attr.aria-label]="'Order ' + order().reference + ', ' + statusLabel()"
      (click)="select.emit(order().id)"
      (keydown.enter)="select.emit(order().id)"
      (keydown.space)="$event.preventDefault(); select.emit(order().id)"
    >
      <header class="chead">
        <span class="chan" [title]="channelLabel()" aria-hidden="true">{{ channelIcon() }}</span>
        <span class="ref">{{ order().reference }}</span>
        <span class="spacer"></span>
        @if (isUrgent()) {
          <span class="urgent-badge">Urgent</span>
        }
        <span class="time">
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          {{ order().updatedAt | timeAgo }}
        </span>
      </header>

      <p class="customer">{{ order().customerName }}</p>

      <ul class="items">
        @for (item of order().items; track item.id) {
          <li>
            <span class="qty">{{ item.quantity }}×</span>
            <span class="iname">{{ item.name }}</span>
            @if (item.notes) {
              <span class="note">{{ item.notes }}</span>
            }
          </li>
        }
      </ul>

      <footer class="cfoot">
        <span class="count">{{ itemCount() }} item{{ itemCount() === 1 ? '' : 's' }}</span>
        <span class="spacer"></span>
        <span class="total">{{ order().total | number: '1.0-0' }} EGP</span>
      </footer>

      @if (canAdvance()) {
        <button
          type="button"
          class="advance"
          [disabled]="order().pending"
          (click)="$event.stopPropagation(); advance.emit(order().id)"
        >
          @if (order().pending) {
            <span class="dot" aria-hidden="true"></span> Syncing…
          } @else {
            Move to {{ nextLabel() }}
            <span aria-hidden="true">→</span>
          }
        </button>
      }
    </article>
  `,
  styleUrl: './order-card.scss',
})
export class OrderCard {
  readonly order = input.required<Order>();
  readonly advance = output<string>();
  readonly select = output<string>();

  protected readonly statusLabel = computed(() => STATUS_LABEL[this.order().status]);
  protected readonly statusColor = computed(() => STATUS_COLOR[this.order().status]);
  protected readonly channelIcon = computed(() => CHANNEL_ICON[this.order().channel]);
  protected readonly channelLabel = computed(() => CHANNEL_LABEL[this.order().channel]);
  protected readonly isUrgent = computed(() => this.order().priority === 'urgent');
  protected readonly canAdvance = computed(() => !isTerminal(this.order().status));
  protected readonly itemCount = computed(() =>
    this.order().items.reduce((sum, i) => sum + i.quantity, 0),
  );
  protected readonly nextLabel = computed(() => {
    const n = nextStatus(this.order().status);
    return n ? STATUS_LABEL[n] : '';
  });
}
