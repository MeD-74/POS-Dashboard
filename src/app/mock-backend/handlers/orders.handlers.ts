import { delay, http, HttpResponse } from 'msw';
import { db } from '../server/in-memory-db';
import type { OrderStatus } from '../../core/models';

const API = '/api';

/** Random latency to make loading/skeleton states real. */
const latency = () => delay(200 + Math.random() * 500);

/** Occasionally fail a mutation so retry/optimistic-rollback paths are exercised. */
const FAILURE_RATE = 0.15;

export const orderHandlers = [
  http.get(`${API}/orders`, async () => {
    await latency();
    return HttpResponse.json({ orders: db.listOrders() });
  }),

  http.get(`${API}/kitchen/load`, async () => {
    await latency();
    return HttpResponse.json(db.getKitchenLoad());
  }),

  http.post(`${API}/orders/:id/advance`, async ({ params }) => {
    await latency();
    if (Math.random() < FAILURE_RATE) {
      return HttpResponse.json({ message: 'Kitchen service unavailable' }, { status: 503 });
    }
    const order = db.advanceOrder(String(params['id']));
    return order
      ? HttpResponse.json({ order })
      : HttpResponse.json({ message: 'Order not found' }, { status: 404 });
  }),

  http.post(`${API}/orders/:id/status`, async ({ params, request }) => {
    await latency();
    const body = (await request.json()) as { status: OrderStatus };
    if (Math.random() < FAILURE_RATE) {
      return HttpResponse.json({ message: 'Kitchen service unavailable' }, { status: 503 });
    }
    const order = db.setOrderStatus(String(params['id']), body.status);
    return order
      ? HttpResponse.json({ order })
      : HttpResponse.json({ message: 'Order not found' }, { status: 404 });
  }),
];
