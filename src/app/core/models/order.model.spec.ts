import { describe, expect, it } from 'vitest';
import { ORDER_FLOW, isTerminal, nextStatus } from './order.model';

describe('order lifecycle', () => {
  it('advances through the flow in order', () => {
    expect(nextStatus('received')).toBe('preparing');
    expect(nextStatus('preparing')).toBe('ready');
    expect(nextStatus('ready')).toBe('delivered');
    expect(nextStatus('delivered')).toBe('completed');
  });

  it('returns null at terminal states', () => {
    expect(nextStatus('completed')).toBeNull();
    expect(nextStatus('cancelled')).toBeNull();
  });

  it('flags terminal states', () => {
    expect(isTerminal('completed')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(isTerminal('preparing')).toBe(false);
  });

  it('keeps ORDER_FLOW consistent with nextStatus', () => {
    for (let i = 0; i < ORDER_FLOW.length - 1; i++) {
      expect(nextStatus(ORDER_FLOW[i])).toBe(ORDER_FLOW[i + 1]);
    }
  });
});
