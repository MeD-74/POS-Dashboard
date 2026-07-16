import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Inline error boundary styled as a self-contained alert card (matching the
 * reference "connection interrupted" pattern). Emits `retry` rather than knowing
 * how to recover — recovery is the caller's business.
 */
@Component({
  selector: 'app-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="err" role="alert">
      <span class="err-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </span>
      <div class="err-body">
        <p class="err-title">{{ title() }}</p>
        <p class="err-msg">{{ message() }}</p>
        @if (retryable()) {
          <button type="button" class="err-retry" (click)="retry.emit()">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path
                d="M20 11a8 8 0 10-1 5m1-5V6m0 5h-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            {{ retryLabel() }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .err {
        display: flex;
        gap: 11px;
        align-items: flex-start;
        padding: 13px 14px;
        border-radius: 12px;
        background: color-mix(in srgb, var(--critical) 7%, var(--surface));
        border: 1px solid color-mix(in srgb, var(--critical) 32%, transparent);
      }
      .err-icon {
        display: inline-grid;
        place-items: center;
        width: 30px;
        height: 30px;
        flex: none;
        border-radius: 8px;
        color: var(--critical);
        background: color-mix(in srgb, var(--critical) 12%, transparent);
      }
      .err-body {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .err-title {
        margin: 0;
        font-weight: 700;
        color: var(--text);
      }
      .err-msg {
        margin: 0;
        font-size: 13px;
        color: var(--text-muted);
      }
      .err-retry {
        align-self: flex-start;
        margin-top: 4px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid color-mix(in srgb, var(--critical) 35%, transparent);
        background: color-mix(in srgb, var(--critical) 10%, transparent);
        color: var(--critical);
        padding: 6px 12px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 13px;
      }
      .err-retry:hover {
        background: color-mix(in srgb, var(--critical) 18%, transparent);
      }
    `,
  ],
})
export class ErrorState {
  readonly title = input('Something went wrong');
  readonly message = input('Please try again.');
  readonly retryable = input(true);
  readonly retryLabel = input('Try again');
  readonly retry = output<void>();
}
