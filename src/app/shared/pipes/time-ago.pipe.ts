import { Pipe, PipeTransform } from '@angular/core';

/**
 * Compact relative-time formatter ("just now", "5m", "1h").
 *
 * Deliberately *impure* would force recomputation every CD cycle; instead we
 * keep it pure and let the workspace's realtime ticks (which change the order's
 * `updatedAt`) drive refreshes. Good enough for a POS board and far cheaper.
 */
@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
  transform(iso: string | null | undefined, now: number = Date.now()): string {
    if (!iso) return '';
    const diffSec = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
    if (diffSec < 45) return 'just now';
    if (diffSec < 90) return '1m';
    const min = Math.round(diffSec / 60);
    if (min < 60) return `${min}m`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h`;
    return `${Math.round(hr / 24)}d`;
  }
}
