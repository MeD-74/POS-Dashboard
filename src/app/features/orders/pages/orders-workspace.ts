import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { OrdersStore, type ChannelFilter, type SortMode } from '../data/orders.store';
import { AiAssistantStore } from '../data/ai-assistant.store';
import { ConnectionService } from '../../../core/offline/connection.service';
import { OrderCard } from '../components/order-card';
import { KitchenMonitor } from '../components/kitchen-monitor';
import { AiPanel } from '../components/ai-panel';
import { Badge } from '../../../shared/ui/badge/badge';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../../shared/ui/states/empty-state';
import { STATUS_COLOR, STATUS_LABEL } from '../components/order-visuals';
import type { OrderStatus } from '../../../core/models';

/**
 * Smart container for the Live Orders Workspace.
 *
 * Orchestrates three stores and holds only view-local UI state (the selected
 * order). All business logic lives in the stores; this component wires signals
 * to presentational children and translates user events into store intents.
 */
@Component({
  selector: 'app-orders-workspace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OrderCard, KitchenMonitor, AiPanel, Badge, Skeleton, EmptyState],
  templateUrl: './orders-workspace.html',
  styleUrl: './orders-workspace.scss',
})
export class OrdersWorkspace {
  protected readonly store = inject(OrdersStore);
  protected readonly ai = inject(AiAssistantStore);
  protected readonly connection = inject(ConnectionService);

  protected readonly selectedId = signal<string | null>(null);
  protected readonly selectedOrder = computed(() => {
    const id = this.selectedId();
    return id ? (this.store.entityMap()[id] ?? null) : null;
  });

  protected readonly statusColor = STATUS_COLOR;
  protected readonly statusLabel = STATUS_LABEL;

  protected columnColor(status: OrderStatus): string {
    return STATUS_COLOR[status];
  }
  protected columnLabel(status: OrderStatus): string {
    return STATUS_LABEL[status];
  }

  protected selectOrder(id: string): void {
    this.selectedId.set(id);
    this.ai.request(id); // switchMap in the store cancels any prior stream
  }

  protected closeDrawer(): void {
    this.selectedId.set(null);
    this.ai.clear();
  }

  protected advance(id: string): void {
    this.store.advance(id);
  }

  protected onChannel(event: Event): void {
    this.store.setChannelFilter((event.target as HTMLSelectElement).value as ChannelFilter);
  }

  protected onSort(event: Event): void {
    this.store.setSortMode((event.target as HTMLSelectElement).value as SortMode);
  }
}
