import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge } from 'rxjs';
import type { ConnectionStatus } from '../models';

/**
 * Single source of truth for connectivity.
 *
 * Combines the real browser signal (`navigator.onLine` + online/offline events)
 * with a manual demo override so the offline story can be shown on demand during
 * the walkthrough without pulling the network cable.
 */
@Injectable({ providedIn: 'root' })
export class ConnectionService {
  private readonly browserOnline = signal(navigator.onLine);
  /** When set, forces offline regardless of the real connection (demo toggle). */
  private readonly forcedOffline = signal(false);

  readonly status = computed<ConnectionStatus>(() =>
    this.forcedOffline() || !this.browserOnline() ? 'offline' : 'online',
  );
  readonly isOnline = computed(() => this.status() === 'online');
  readonly isForcedOffline = this.forcedOffline.asReadonly();

  constructor() {
    const destroyRef = inject(DestroyRef);
    merge(fromEvent(window, 'online'), fromEvent(window, 'offline'))
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => this.browserOnline.set(navigator.onLine));
  }

  /** Demo affordance: flip simulated connectivity. */
  toggleOffline(): void {
    this.forcedOffline.update((v) => !v);
  }
}
