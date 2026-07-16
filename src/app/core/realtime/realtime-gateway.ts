import { Observable } from 'rxjs';
import type { RealtimeEvent } from '../models';

/**
 * Abstraction over the realtime transport.
 *
 * Feature stores depend on this abstract class (used as the DI token), never on
 * a concrete socket. That keeps the app decoupled from *how* events arrive — the
 * mock `WebSocket`-style gateway can be swapped for a real one without touching
 * a single consumer.
 */
export abstract class RealtimeGateway {
  /** Hot stream of server-pushed events. Multicast; safe to share. */
  abstract readonly events$: Observable<RealtimeEvent>;
  abstract connect(): void;
  abstract disconnect(): void;
}
