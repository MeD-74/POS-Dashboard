import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EMPTY, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersStore } from './orders.store';
import { OrdersApi } from './orders.api';
import { RealtimeGateway } from '../../../core/realtime/realtime-gateway';
import { ConnectionService } from '../../../core/offline/connection.service';
import type { Order } from '../../../core/models';

function order(overrides: Partial<Order> = {}): Order {
  const now = new Date().toISOString();
  return {
    id: 'order-1',
    reference: '#1',
    channel: 'walk-in',
    status: 'received',
    priority: 'normal',
    items: [],
    total: 100,
    customerName: 'Test',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('OrdersStore', () => {
  let api: {
    getOrders: ReturnType<typeof vi.fn>;
    getKitchenLoad: ReturnType<typeof vi.fn>;
    advance: ReturnType<typeof vi.fn>;
    setStatus: ReturnType<typeof vi.fn>;
  };
  const online = signal(true);

  function setup(initial: Order[] = [order()]) {
    online.set(true);
    api = {
      getOrders: vi.fn().mockReturnValue(of(initial)),
      getKitchenLoad: vi.fn().mockReturnValue(EMPTY),
      advance: vi.fn(),
      setStatus: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: OrdersApi, useValue: api },
        { provide: RealtimeGateway, useValue: { events$: EMPTY, connect: vi.fn(), disconnect: vi.fn() } },
        { provide: ConnectionService, useValue: { isOnline: () => online() } },
      ],
    });
    return TestBed.inject(OrdersStore);
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('loads orders into board columns on init', () => {
    const store = setup([order({ status: 'received' })]);
    expect(store.entities().length).toBe(1);
    const received = store.columns().find((c) => c.status === 'received');
    expect(received?.orders.length).toBe(1);
  });

  it('applies an optimistic advance and confirms it on success', () => {
    const store = setup([order({ status: 'received' })]);
    api.advance.mockReturnValue(of(order({ status: 'preparing', pending: false })));

    store.advance('order-1');

    expect(store.entityMap()['order-1'].status).toBe('preparing');
    expect(store.pendingSyncCount()).toBe(0); // outbox drained on success
    expect(api.advance).toHaveBeenCalledOnce();
  });

  it('rolls back the optimistic change when the server rejects it', () => {
    const store = setup([order({ status: 'received' })]);
    api.advance.mockReturnValue(throwError(() => ({ status: 503, error: { message: 'busy' } })));

    store.advance('order-1');

    expect(store.entityMap()['order-1'].status).toBe('received'); // rolled back
    expect(store.pendingSyncCount()).toBe(0);
    expect(store.error()).toBeTruthy();
  });

  it('queues the mutation while offline without calling the API', () => {
    const store = setup([order({ status: 'received' })]);
    online.set(false);

    store.advance('order-1');

    expect(api.advance).not.toHaveBeenCalled();
    expect(store.pendingSyncCount()).toBe(1);
    expect(store.entityMap()['order-1'].status).toBe('preparing'); // optimistic held
  });

  it('prevents duplicate commands for the same order', () => {
    const store = setup([order({ status: 'received' })]);
    online.set(false);

    store.advance('order-1');
    store.advance('order-1');

    expect(store.pendingSyncCount()).toBe(1);
  });

  it('replays the outbox automatically on reconnect', () => {
    const store = setup([order({ status: 'received' })]);
    const appRef = TestBed.inject(ApplicationRef);
    appRef.tick(); // let the reconnect effect capture the initial (online) state

    online.set(false);
    appRef.tick(); // effect observes the offline transition
    store.advance('order-1');
    expect(store.pendingSyncCount()).toBe(1);

    api.advance.mockReturnValue(of(order({ status: 'preparing', pending: false })));
    online.set(true);
    appRef.tick(); // effect observes online && was-offline → auto-flush

    expect(api.advance).toHaveBeenCalledOnce();
    expect(store.pendingSyncCount()).toBe(0);
  });
});
