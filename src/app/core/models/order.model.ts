/**
 * Domain model for the Live Orders Workspace.
 *
 * Kept intentionally framework-agnostic (no Angular / RxJS imports) so the
 * domain layer can be unit-tested in isolation and reused across features.
 */

export type OrderChannel = 'walk-in' | 'delivery' | 'online';

/**
 * The canonical order lifecycle. Order of the union is meaningful: it doubles
 * as the forward-progression sequence used by `nextStatus()`.
 */
export type OrderStatus =
  | 'received'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'completed'
  | 'cancelled';

/**
 * Priority is derived, never stored by the user. It is recomputed whenever the
 * kitchen load changes, so it lives on the read-model rather than being an
 * editable field.
 */
export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface OrderItem {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly notes?: string;
}

export interface Order {
  readonly id: string;
  readonly reference: string;
  readonly channel: OrderChannel;
  readonly status: OrderStatus;
  readonly priority: OrderPriority;
  readonly items: readonly OrderItem[];
  readonly total: number;
  readonly customerName: string;
  readonly tableNumber?: number;
  readonly createdAt: string; // ISO
  readonly updatedAt: string; // ISO
  /** True while an optimistic mutation is in-flight (offline queue / status change). */
  readonly pending?: boolean;
}

/** The forward-only lifecycle used for the "advance" action in the UI. */
export const ORDER_FLOW: readonly OrderStatus[] = [
  'received',
  'preparing',
  'ready',
  'delivered',
  'completed',
] as const;

/** Returns the next status in the lifecycle, or `null` if already terminal. */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  if (status === 'cancelled' || status === 'completed') return null;
  const idx = ORDER_FLOW.indexOf(status);
  return idx === -1 || idx === ORDER_FLOW.length - 1 ? null : ORDER_FLOW[idx + 1];
}

export function isTerminal(status: OrderStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}
