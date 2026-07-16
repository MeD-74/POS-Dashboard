/**
 * Domain model for Offline Support.
 *
 * User actions performed while offline (or optimistically while online) are
 * captured as serialisable "commands" queued in a durable outbox. On
 * reconnection the outbox is replayed. Each command carries an idempotency key
 * so a replay can never apply the same mutation twice.
 */

import type { OrderStatus } from './order.model';

export type QueuedCommandType = 'advance-status' | 'set-status' | 'cancel-order';

export interface QueuedCommand {
  /** Idempotency key — the server dedupes on this so a replay can't double-apply. */
  readonly id: string;
  readonly type: QueuedCommandType;
  readonly orderId: string;
  readonly targetStatus?: OrderStatus;
  /** Status to restore if the command ultimately fails (optimistic rollback). */
  readonly rollbackStatus?: OrderStatus;
  readonly createdAt: string;
  readonly attempts: number;
}

export type ConnectionStatus = 'online' | 'offline' | 'reconnecting';
