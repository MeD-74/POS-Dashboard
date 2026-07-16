/**
 * Domain model for the Kitchen Load Monitor.
 *
 * Kitchen load is a live signal that feeds back into order priority. The
 * derivation logic lives here (pure functions) so it is trivially unit-testable
 * and shared between the store and the tests.
 */

import type { Order, OrderPriority } from './order.model';

export type KitchenLoadLevel = 'idle' | 'steady' | 'busy' | 'overloaded';

export interface KitchenLoad {
  /** 0..100 utilisation percentage of the kitchen. */
  readonly utilization: number;
  readonly level: KitchenLoadLevel;
  /** Number of orders currently in the "preparing" stage. */
  readonly activeTickets: number;
  /** Estimated additional minutes added to every ticket due to load. */
  readonly delayMinutes: number;
  readonly updatedAt: string;
}

export function levelFromUtilization(utilization: number): KitchenLoadLevel {
  if (utilization >= 85) return 'overloaded';
  if (utilization >= 60) return 'busy';
  if (utilization >= 25) return 'steady';
  return 'idle';
}

/**
 * Pure priority derivation: combines how long an order has waited with the
 * current kitchen pressure. Deterministic → easy to test.
 */
export function derivePriority(order: Order, load: KitchenLoadLevel, now: number): OrderPriority {
  const ageMinutes = (now - new Date(order.createdAt).getTime()) / 60_000;

  let score = 0;
  if (order.channel === 'delivery') score += 1;
  if (ageMinutes > 10) score += 1;
  if (ageMinutes > 20) score += 1;
  if (load === 'busy') score += 1;
  if (load === 'overloaded') score += 2;

  if (score >= 4) return 'urgent';
  if (score >= 3) return 'high';
  if (score >= 1) return 'normal';
  return 'low';
}
