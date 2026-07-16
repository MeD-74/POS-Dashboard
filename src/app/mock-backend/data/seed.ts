import type {
  Order,
  OrderChannel,
  OrderItem,
  OrderStatus,
  Product,
  ProductCategory,
} from '../../core/models';
import { PRODUCT_CATEGORIES } from '../../core/models';
import { Rng } from './rng';

const rng = new Rng(20240710); // deterministic datasets → reproducible demos & tests

const MENU: Record<ProductCategory, string[]> = {
  burgers: ['Classic Cheeseburger', 'Double Bacon Burger', 'Spicy Chicken Burger', 'Veggie Burger'],
  pizza: ['Margherita', 'Pepperoni Feast', 'BBQ Chicken', 'Four Cheese', 'Veggie Supreme'],
  sides: ['French Fries', 'Onion Rings', 'Mozzarella Sticks', 'Garlic Bread', 'Coleslaw'],
  drinks: ['Cola', 'Fresh Orange Juice', 'Iced Latte', 'Mineral Water', 'Lemon Mint'],
  desserts: ['Chocolate Lava Cake', 'Cheesecake', 'Ice Cream Sundae', 'Baklava'],
  salads: ['Caesar Salad', 'Greek Salad', 'Quinoa Bowl', 'Garden Salad'],
  breakfast: ['Pancake Stack', 'Eggs Benedict', 'Shakshuka', 'Avocado Toast'],
};

const ADJECTIVES = ['Deluxe', 'Spicy', 'Classic', 'Grande', 'Mini', 'Loaded', 'Signature', 'Fresh'];
const ALLERGENS = ['gluten', 'dairy', 'nuts', 'eggs', 'soy', 'shellfish'];
const NAMES = ['Omar', 'Sara', 'Ali', 'Mona', 'Youssef', 'Layla', 'Karim', 'Nour', 'Hana', 'Tarek'];
const NOTES = ['no onions', 'extra spicy', 'well done', 'no ice', 'gluten free'];

/** Builds a large, realistic product catalogue for the search module. */
export function seedProducts(count = 400): Product[] {
  const products: Product[] = [];
  let n = 0;
  while (products.length < count) {
    const category = rng.pick(PRODUCT_CATEGORIES);
    const base = rng.pick(MENU[category]);
    const adj = rng.pick(ADJECTIVES);
    // Avoid awkward duplicates like "Fresh Fresh Orange Juice".
    const decorated = base.startsWith(adj) ? base : `${adj} ${base}`;
    products.push({
      id: `prod-${n}`,
      name: n < 40 ? base : decorated,
      category,
      price: rng.price(15, 220),
      available: rng.bool(0.9),
      allergens: rng.sample(ALLERGENS, rng.int(0, 3)),
      popularity: rng.int(0, 100),
    });
    n++;
  }
  return products;
}

const CHANNELS: OrderChannel[] = ['walk-in', 'delivery', 'online'];
const START_STATUSES: OrderStatus[] = ['received', 'preparing', 'ready'];

function buildItems(products: Product[]): OrderItem[] {
  const chosen = rng.sample(products, rng.int(1, 4));
  return chosen.map((p) => ({
    id: p.id,
    name: p.name,
    quantity: rng.int(1, 3),
    unitPrice: p.price,
    notes: rng.bool(0.2) ? rng.pick(NOTES) : undefined,
  }));
}

/** Builds the initial live-order board. */
export function seedOrders(products: Product[], count = 12): Order[] {
  const orders: Order[] = [];
  for (let i = 0; i < count; i++) {
    const items = buildItems(products);
    const total = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    // Spread creation times across the last ~30 minutes so priorities vary.
    const createdAt = new Date(Date.now() - rng.int(0, 30) * 60_000).toISOString();
    orders.push({
      id: `order-${i}`,
      reference: `#${rng.int(1000, 9999)}`,
      channel: rng.pick(CHANNELS),
      status: rng.pick(START_STATUSES),
      priority: 'normal',
      items,
      total,
      customerName: rng.pick(NAMES),
      tableNumber: rng.bool(0.4) ? rng.int(1, 24) : undefined,
      createdAt,
      updatedAt: createdAt,
    });
  }
  return orders;
}
