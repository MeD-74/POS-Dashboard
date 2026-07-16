/**
 * Tiny deterministic PRNG + data helpers.
 *
 * Deliberately dependency-free: a seeded `mulberry32` generator gives us
 * reproducible demo/test datasets without pulling a multi-hundred-KB faker into
 * the bundle. Same seed → same data every run, which keeps the demo and the
 * unit tests stable.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  /** `count` distinct picks (or fewer if the pool is smaller). */
  sample<T>(items: readonly T[], count: number): T[] {
    const pool = [...items];
    const out: T[] = [];
    while (out.length < count && pool.length) {
      out.push(pool.splice(this.int(0, pool.length - 1), 1)[0]);
    }
    return out;
  }

  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  price(min: number, max: number): number {
    return this.int(min, max);
  }
}
