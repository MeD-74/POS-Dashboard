/** Short unique id for client-generated entities (command idempotency keys). */
export function uid(prefix = 'id'): string {
  const rand = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}_${rand}`;
}

/** Normalises unknown thrown values into a user-facing message. */
export function toMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const maybe = error as { error?: { message?: string }; message?: string };
    return maybe.error?.message ?? maybe.message ?? fallback;
  }
  return fallback;
}
