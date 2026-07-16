import { Subject, Observable } from 'rxjs';
import {
  derivePriority,
  isTerminal,
  levelFromUtilization,
  nextStatus,
  type KitchenLoad,
  type Order,
  type OrderStatus,
  type Product,
  type ProductCategory,
  type RealtimeEvent,
} from '../../core/models';
import { seedOrders, seedProducts } from '../data/seed';

/**
 * The mock backend's single source of truth.
 *
 * A real deployment would replace this with a database + message broker; keeping
 * it behind one module means the REST handlers and the realtime gateway stay
 * perfectly consistent (they mutate/read the exact same state), which is what
 * makes the live-updates simulation believable.
 *
 * Exposed as a module-level singleton because MSW handlers and the realtime
 * gateway both run in the page context and must share one instance.
 */
class InMemoryDb {
  private products: Product[] = seedProducts(400);
  private orders: Order[] = seedOrders(this.products, 12);
  private load: KitchenLoad = this.computeLoad();

  private readonly events = new Subject<RealtimeEvent>();
  /** Stream every REST handler + realtime gateway listens to. */
  readonly events$: Observable<RealtimeEvent> = this.events.asObservable();

  private nextOrderSeq = 100;

  // ---- Reads -------------------------------------------------------------

  listOrders(): Order[] {
    return [...this.orders];
  }

  getOrder(id: string): Order | undefined {
    return this.orders.find((o) => o.id === id);
  }

  getKitchenLoad(): KitchenLoad {
    return this.load;
  }

  listProducts(): Product[] {
    return this.products;
  }

  searchProducts(term: string, categories: ProductCategory[]): Product[] {
    const q = term.trim().toLowerCase();
    return this.products
      .filter((p) => (categories.length ? categories.includes(p.category) : true))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) || p.category.includes(q) : true))
      .sort((a, b) => rank(b, q) - rank(a, q));
  }

  // ---- Writes (each emits a realtime event) ------------------------------

  advanceOrder(id: string): Order | undefined {
    const current = this.getOrder(id);
    if (!current) return undefined;
    const next = nextStatus(current.status);
    if (!next) return current;
    return this.setOrderStatus(id, next);
  }

  setOrderStatus(id: string, status: OrderStatus): Order | undefined {
    const idx = this.orders.findIndex((o) => o.id === id);
    if (idx === -1) return undefined;
    const updated: Order = {
      ...this.orders[idx],
      status,
      updatedAt: new Date().toISOString(),
      pending: false,
    };
    this.orders[idx] = updated;
    this.refreshLoadAndPriorities();
    this.events.next({ type: 'order-updated', order: updated });
    return updated;
  }

  // ---- Autonomous simulation (called by the realtime gateway clock) ------

  /**
   * One simulation step: nudges a random active order forward and occasionally
   * spawns a brand-new order, then recomputes derived kitchen load + priorities.
   */
  tick(): void {
    const active = this.orders.filter((o) => !isTerminal(o.status));
    if (active.length && Math.random() < 0.6) {
      const victim = active[Math.floor(Math.random() * active.length)];
      this.advanceOrder(victim.id);
    }
    if (Math.random() < 0.2) {
      this.spawnOrder();
    }
    // Always re-emit load so the monitor breathes even on quiet ticks.
    this.refreshLoadAndPriorities();
    this.events.next({ type: 'kitchen-load', load: this.load });
  }

  private spawnOrder(): void {
    const [order] = seedOrders(this.products, 1);
    const created: Order = {
      ...order,
      id: `order-${this.nextOrderSeq++}`,
      status: 'received',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.orders = [created, ...this.orders];
    this.refreshLoadAndPriorities();
    this.events.next({ type: 'order-created', order: created });
  }

  private refreshLoadAndPriorities(): void {
    this.load = this.computeLoad();
    const now = Date.now();
    const level = this.load.level;
    this.orders = this.orders.map((o) => {
      if (isTerminal(o.status)) return o;
      const priority = derivePriority(o, level, now);
      return priority === o.priority ? o : { ...o, priority };
    });
  }

  private computeLoad(): KitchenLoad {
    const activeTickets = this.orders.filter((o) => o.status === 'preparing').length;
    const utilization = Math.min(100, activeTickets * 18 + Math.floor(Math.random() * 8));
    return {
      utilization,
      level: levelFromUtilization(utilization),
      activeTickets,
      delayMinutes: Math.round(utilization / 20),
      updatedAt: new Date().toISOString(),
    };
  }
}

function rank(p: Product, q: string): number {
  if (!q) return p.popularity;
  const name = p.name.toLowerCase();
  if (name === q) return 1000 + p.popularity;
  if (name.startsWith(q)) return 500 + p.popularity;
  return p.popularity;
}

/** Module singleton shared by every mock-backend consumer. */
export const db = new InMemoryDb();
