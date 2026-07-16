import { computed, effect, inject, untracked } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  setAllEntities,
  updateEntity,
  withEntities,
  type EntityId,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe } from 'rxjs';
import { catchError, mergeMap, switchMap, tap } from 'rxjs/operators';

import {
  ORDER_FLOW,
  isTerminal,
  nextStatus,
  type KitchenLoad,
  type Order,
  type OrderChannel,
  type OrderPriority,
  type OrderStatus,
  type QueuedCommand,
} from '../../../core/models';
import { RealtimeGateway } from '../../../core/realtime/realtime-gateway';
import { ConnectionService } from '../../../core/offline/connection.service';
import { toMessage, uid } from '../../../shared/utils/id.util';
import { OrdersApi } from './orders.api';

export type ChannelFilter = OrderChannel | 'all';
export type SortMode = 'priority' | 'oldest' | 'newest';

interface OrdersState {
  readonly kitchenLoad: KitchenLoad | null;
  readonly loading: boolean;
  readonly error: string | null;
  /** Durable outbox of not-yet-confirmed mutations (offline queue). */
  readonly outbox: readonly QueuedCommand[];
  readonly channelFilter: ChannelFilter;
  readonly sortMode: SortMode;
  readonly autoAccept: boolean;
}

const PRIORITY_RANK: Record<OrderPriority, number> = { urgent: 3, high: 2, normal: 1, low: 0 };

function comparator(mode: SortMode): (a: Order, b: Order) => number {
  switch (mode) {
    case 'oldest':
      return (a, b) => a.createdAt.localeCompare(b.createdAt);
    case 'newest':
      return (a, b) => b.createdAt.localeCompare(a.createdAt);
    case 'priority':
      return (a, b) =>
        PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
        a.createdAt.localeCompare(b.createdAt);
  }
}

/**
 * The Live Orders Workspace store.
 *
 * Owns *all* order business logic: loading, realtime merge, optimistic status
 * mutations, the offline outbox, and replay-on-reconnect. Components stay dumb —
 * they read signals and call intent methods. Signal-based state means change
 * detection only touches the columns that actually changed, satisfying the
 * "no unnecessary re-renders" requirement without manual OnPush plumbing.
 */
export const OrdersStore = signalStore(
  { providedIn: 'root' },
  withState<OrdersState>({
    kitchenLoad: null,
    loading: false,
    error: null,
    outbox: [],
    channelFilter: 'all',
    sortMode: 'priority',
    autoAccept: true,
  }),
  withEntities<Order>(),

  withComputed((store) => ({
    /** Orders grouped into board columns, honouring the channel filter + sort. */
    columns: computed(() => {
      const channel = store.channelFilter();
      const cmp = comparator(store.sortMode());
      const all =
        channel === 'all'
          ? store.entities()
          : store.entities().filter((o) => o.channel === channel);
      return ORDER_FLOW.map((status) => ({
        status,
        orders: all.filter((o) => o.status === status).sort(cmp),
      }));
    }),
    activeCount: computed(() => store.entities().filter((o) => !isTerminal(o.status)).length),
    pendingSyncCount: computed(() => store.outbox().length),
    urgentCount: computed(
      () => store.entities().filter((o) => o.priority === 'urgent' && !isTerminal(o.status)).length,
    ),
  })),

  withMethods((store) => {
    const api = inject(OrdersApi);
    const gateway = inject(RealtimeGateway);
    const connection = inject(ConnectionService);

    const removeFromOutbox = (id: string) => ({
      outbox: store.outbox().filter((c) => c.id !== id),
    });

    /** Maps a queued command to its HTTP call. */
    const execute = (cmd: QueuedCommand) =>
      cmd.type === 'advance-status'
        ? api.advance(cmd.orderId, cmd.id)
        : api.setStatus(cmd.orderId, cmd.targetStatus!, cmd.id);

    /**
     * Sends queued commands to the server. `mergeMap` lets commands for
     * *different* orders run concurrently; the per-order guard in `advance()`
     * prevents concurrent commands for the *same* order (race condition).
     */
    const dispatch = rxMethod<QueuedCommand>(
      mergeMap((cmd) =>
        execute(cmd).pipe(
          tap((order) =>
            patchState(store, updateEntity({ id: order.id, changes: order }), removeFromOutbox(cmd.id)),
          ),
          catchError((err) => {
            const offlineNow = !connection.isOnline() || err?.status === 0;
            if (offlineNow) {
              // Network failure → keep optimistic state, leave queued for replay.
              patchState(store, { error: 'Working offline — changes will sync on reconnect' });
              return EMPTY;
            }
            // Genuine server rejection → roll the optimistic change back.
            patchState(
              store,
              cmd.rollbackStatus
                ? updateEntity({
                    id: cmd.orderId,
                    changes: { status: cmd.rollbackStatus, pending: false },
                  })
                : {},
              removeFromOutbox(cmd.id),
              { error: toMessage(err, 'Could not update order') },
            );
            return EMPTY;
          }),
        ),
      ),
    );

    return {
      /** Initial load (and manual refresh). `switchMap` cancels a stale reload. */
      loadOrders: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(() =>
            api.getOrders().pipe(
              tap((orders) => patchState(store, setAllEntities(orders), { loading: false })),
              catchError((err) => {
                patchState(store, { loading: false, error: toMessage(err, 'Failed to load orders') });
                return EMPTY;
              }),
            ),
          ),
        ),
      ),

      /** Subscribe to the realtime channel and merge pushes into state. */
      connectRealtime: rxMethod<void>(
        switchMap(() =>
          gateway.events$.pipe(
            tap((evt) => {
              switch (evt.type) {
                case 'kitchen-load':
                  patchState(store, { kitchenLoad: evt.load });
                  break;
                case 'order-created':
                case 'order-updated': {
                  // Never let a server push clobber an in-flight optimistic order.
                  const inFlight = store.outbox().some((c) => c.orderId === evt.order.id);
                  if (!inFlight) {
                    patchState(store, updateEntity({ id: evt.order.id as EntityId, changes: evt.order }));
                  }
                  break;
                }
              }
            }),
          ),
        ),
      ),

      /** User intent: advance an order one step through the lifecycle. */
      advance(orderId: string): void {
        const order = store.entityMap()[orderId];
        if (!order || isTerminal(order.status)) return;
        // Prevent duplicated user actions: one in-flight command per order.
        if (store.outbox().some((c) => c.orderId === orderId)) return;

        const target = nextStatus(order.status);
        if (!target) return;

        const cmd: QueuedCommand = {
          id: uid('cmd'),
          type: 'advance-status',
          orderId,
          targetStatus: target,
          rollbackStatus: order.status,
          createdAt: new Date().toISOString(),
          attempts: 0,
        };

        // Optimistic update + enqueue happen together.
        patchState(
          store,
          updateEntity({ id: orderId, changes: { status: target, pending: true } }),
          { outbox: [...store.outbox(), cmd], error: null },
        );

        if (connection.isOnline()) dispatch(cmd);
      },

      /** Replay every queued command (called automatically on reconnect). */
      flushOutbox(): void {
        for (const cmd of store.outbox()) dispatch(cmd);
      },

      dismissError(): void {
        patchState(store, { error: null });
      },

      setChannelFilter(channelFilter: ChannelFilter): void {
        patchState(store, { channelFilter });
      },
      setSortMode(sortMode: SortMode): void {
        patchState(store, { sortMode });
      },
      toggleAutoAccept(): void {
        patchState(store, { autoAccept: !store.autoAccept() });
      },
    };
  }),

  withHooks((store) => {
    const connection = inject(ConnectionService);
    const gateway = inject(RealtimeGateway);
    return {
      onInit() {
        store.loadOrders();
        gateway.connect();
        store.connectRealtime();

        // Auto-flush the outbox the moment connectivity is restored.
        let wasOnline = connection.isOnline();
        effect(() => {
          const online = connection.isOnline();
          if (online && !wasOnline && untracked(() => store.outbox().length > 0)) {
            store.flushOutbox();
          }
          wasOnline = online;
        });
      },
      onDestroy() {
        gateway.disconnect();
      },
    };
  }),
);
