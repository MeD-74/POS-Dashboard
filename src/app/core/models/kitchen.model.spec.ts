import { describe, expect, it } from 'vitest';
import { derivePriority, levelFromUtilization } from './kitchen.model';
import type { Order } from './order.model';

function makeOrder(overrides: Partial<Order> = {}): Order {
  const now = new Date().toISOString();
  return {
    id: 'o1',
    reference: '#1',
    channel: 'walk-in',
    status: 'received',
    priority: 'normal',
    items: [],
    total: 0,
    customerName: 'Test',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('levelFromUtilization', () => {
  it('maps utilisation to bands', () => {
    expect(levelFromUtilization(0)).toBe('idle');
    expect(levelFromUtilization(30)).toBe('steady');
    expect(levelFromUtilization(70)).toBe('busy');
    expect(levelFromUtilization(90)).toBe('overloaded');
  });
});

describe('derivePriority', () => {
  const now = Date.now();

  it('is low for a fresh walk-in with an idle kitchen', () => {
    const order = makeOrder({ createdAt: new Date(now).toISOString() });
    expect(derivePriority(order, 'idle', now)).toBe('low');
  });

  it('escalates as an order ages', () => {
    // delivery(+1) + age>10(+1) + age>20(+1) = 3 → high
    const old = makeOrder({
      channel: 'delivery',
      createdAt: new Date(now - 25 * 60_000).toISOString(),
    });
    expect(derivePriority(old, 'idle', now)).toBe('high');
  });

  it('escalates to urgent when the kitchen is overloaded and the order is old', () => {
    const old = makeOrder({
      channel: 'delivery',
      createdAt: new Date(now - 25 * 60_000).toISOString(),
    });
    expect(derivePriority(old, 'overloaded', now)).toBe('urgent');
  });

  it('weights delivery orders higher than walk-ins', () => {
    // Under a busy kitchen the delivery bonus crosses a band boundary:
    // delivery 1+1(age)+1(busy)=3 → high vs walk-in 1(age)+1(busy)=2 → normal.
    const created = new Date(now - 12 * 60_000).toISOString();
    const delivery = derivePriority(makeOrder({ channel: 'delivery', createdAt: created }), 'busy', now);
    const walkIn = derivePriority(makeOrder({ channel: 'walk-in', createdAt: created }), 'busy', now);
    const rank = { low: 0, normal: 1, high: 2, urgent: 3 } as const;
    expect(rank[delivery]).toBeGreaterThan(rank[walkIn]);
  });
});
