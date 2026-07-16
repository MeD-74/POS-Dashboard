import type { KitchenLoad } from './kitchen.model';
import type { Order } from './order.model';

/**
 * Contract for the realtime channel (simulated WebSocket / SSE).
 *
 * Lives in the domain layer so both the app (consumer) and the mock backend
 * (producer) depend on this shared type rather than on each other.
 */
export type RealtimeEvent =
  | { readonly type: 'order-created'; readonly order: Order }
  | { readonly type: 'order-updated'; readonly order: Order }
  | { readonly type: 'kitchen-load'; readonly load: KitchenLoad };
