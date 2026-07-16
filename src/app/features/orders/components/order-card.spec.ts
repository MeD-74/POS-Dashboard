import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderCard } from './order-card';
import type { Order } from '../../../core/models';

function makeOrder(overrides: Partial<Order> = {}): Order {
  const now = new Date().toISOString();
  return {
    id: 'order-1',
    reference: '#1234',
    channel: 'delivery',
    status: 'received',
    priority: 'normal',
    items: [
      { id: 'a', name: 'Cheeseburger', quantity: 2, unitPrice: 50 },
      { id: 'b', name: 'Fries', quantity: 1, unitPrice: 20, notes: 'extra crispy' },
    ],
    total: 120,
    customerName: 'Sara',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function mount(order: Order): ComponentFixture<OrderCard> {
  const fixture = TestBed.createComponent(OrderCard);
  fixture.componentRef.setInput('order', order);
  fixture.detectChanges();
  return fixture;
}

describe('OrderCard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [OrderCard] });
  });

  it('renders the reference, customer and summed item count', () => {
    const el = mount(makeOrder()).nativeElement as HTMLElement;
    expect(el.querySelector('.ref')?.textContent).toContain('#1234');
    expect(el.querySelector('.customer')?.textContent).toContain('Sara');
    expect(el.querySelector('.count')?.textContent).toContain('3 items'); // 2 + 1
  });

  it('renders per-item note tags', () => {
    const el = mount(makeOrder()).nativeElement as HTMLElement;
    expect(el.querySelector('.note')?.textContent).toContain('extra crispy');
  });

  it('shows the urgent badge only for urgent orders', () => {
    const urgent = mount(makeOrder({ priority: 'urgent' })).nativeElement as HTMLElement;
    const normal = mount(makeOrder({ priority: 'normal' })).nativeElement as HTMLElement;
    expect(urgent.querySelector('.urgent-badge')).toBeTruthy();
    expect(normal.querySelector('.urgent-badge')).toBeNull();
  });

  it('emits advance (and not select) when the advance button is clicked', () => {
    const fixture = mount(makeOrder());
    const advance = vi.fn();
    const select = vi.fn();
    fixture.componentInstance.advance.subscribe(advance);
    fixture.componentInstance.select.subscribe(select);

    fixture.nativeElement.querySelector('.advance').click();

    expect(advance).toHaveBeenCalledWith('order-1');
    expect(select).not.toHaveBeenCalled(); // stopPropagation guards the card click
  });

  it('emits select when the card body is clicked', () => {
    const fixture = mount(makeOrder());
    const select = vi.fn();
    fixture.componentInstance.select.subscribe(select);

    fixture.nativeElement.querySelector('.card').click();

    expect(select).toHaveBeenCalledWith('order-1');
  });

  it('hides the advance button for terminal orders', () => {
    const el = mount(makeOrder({ status: 'completed' })).nativeElement as HTMLElement;
    expect(el.querySelector('.advance')).toBeNull();
  });
});
