import { Injectable } from '@angular/core';
import { Observable, Subscription, timer } from 'rxjs';
import { share } from 'rxjs/operators';
import { RealtimeGateway } from '../../core/realtime/realtime-gateway';
import type { RealtimeEvent } from '../../core/models';
import { db } from '../server/in-memory-db';

/**
 * Simulated WebSocket gateway.
 *
 * Drives the mock backend's clock (`db.tick()`) on an interval and republishes
 * the backend's event stream. `share()` makes it a single multicast source no
 * matter how many stores subscribe — mirroring one real socket connection and
 * preventing N duplicate "connections".
 */
@Injectable()
export class MockRealtimeGateway extends RealtimeGateway {
  private static readonly TICK_MS = 3500;

  private clock?: Subscription;

  readonly events$: Observable<RealtimeEvent> = db.events$.pipe(share());

  connect(): void {
    if (this.clock) return; // idempotent — never open two connections
    this.clock = timer(MockRealtimeGateway.TICK_MS, MockRealtimeGateway.TICK_MS).subscribe(() =>
      db.tick(),
    );
  }

  disconnect(): void {
    this.clock?.unsubscribe();
    this.clock = undefined;
  }
}
