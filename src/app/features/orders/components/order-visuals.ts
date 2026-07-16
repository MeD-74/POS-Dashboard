import type { OrderChannel, OrderPriority, OrderStatus } from '../../../core/models';

/** Pure presentation lookups — colours map to the design tokens in styles.scss. */

export const STATUS_COLOR: Record<OrderStatus, string> = {
  received: 'var(--received)',
  preparing: 'var(--preparing)',
  ready: 'var(--ready)',
  delivered: 'var(--delivered)',
  completed: 'var(--completed)',
  cancelled: 'var(--cancelled)',
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: 'Received',
  preparing: 'Preparing',
  ready: 'Ready',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PRIORITY_COLOR: Record<OrderPriority, string> = {
  urgent: 'var(--prio-urgent)',
  high: 'var(--prio-high)',
  normal: 'var(--prio-normal)',
  low: 'var(--prio-low)',
};

export const CHANNEL_ICON: Record<OrderChannel, string> = {
  'walk-in': '🏪',
  delivery: '🛵',
  online: '🌐',
};

export const CHANNEL_LABEL: Record<OrderChannel, string> = {
  'walk-in': 'Walk-in',
  delivery: 'Delivery',
  online: 'Online',
};
