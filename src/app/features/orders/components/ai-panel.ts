import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { ErrorState } from '../../../shared/ui/states/error-state';
import type { AiAssistantState, AiSeverity } from '../../../core/models';

const SEVERITY_COLOR: Record<AiSeverity, string> = {
  info: 'var(--info)',
  warning: 'var(--warning)',
  critical: 'var(--critical)',
};

const SEVERITY_ICON: Record<AiSeverity, string> = {
  info: '💡',
  warning: '⚠️',
  critical: '🚨',
};

/**
 * Renders the AI assistant's finite state machine. One clearly-defined view per
 * `status` — the discriminated union makes it impossible to forget a state.
 */
@Component({
  selector: 'app-ai-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Skeleton, ErrorState],
  template: `
    <section class="ai" aria-live="polite">
      <header class="ai-head">
        <span class="spark" aria-hidden="true">✨</span>
        <h3>AI Assistant</h3>
      </header>

      @switch (state().status) {
        @case ('idle') {
          <p class="muted">Select an order to get AI recommendations.</p>
        }
        @case ('loading') {
          <div class="analyzing" aria-label="Assistant is thinking">
            <span class="spinner" aria-hidden="true"></span>
            <span>Analyzing order…</span>
          </div>
          <div class="stack">
            <app-skeleton height="14px" />
            <app-skeleton width="80%" height="14px" />
            <app-skeleton width="60%" height="14px" />
          </div>
        }
        @case ('streaming') {
          <p class="stream">{{ partial() }}<span class="caret" aria-hidden="true">▋</span></p>
        }
        @case ('success') {
          <p class="summary">{{ summary() }}</p>
          @if (suggestions().length) {
            <ul class="suggestions">
              @for (s of suggestions(); track s.title) {
                <li class="suggestion" [style.--c]="severityColor(s.severity)">
                  <span class="s-icon" aria-hidden="true">{{ severityIcon(s.severity) }}</span>
                  <div>
                    <p class="s-title">{{ s.title }}</p>
                    <p class="s-detail">{{ s.detail }}</p>
                  </div>
                </li>
              }
            </ul>
          } @else {
            <p class="muted">No issues found — good to go. ✅</p>
          }
        }
        @case ('error') {
          <app-error-state
            title="Couldn't load suggestions"
            [message]="errorMessage()"
            retryLabel="Retry"
            (retry)="retry.emit()"
          />
        }
      }
    </section>
  `,
  styleUrl: './ai-panel.scss',
})
export class AiPanel {
  readonly state = input.required<AiAssistantState>();
  readonly retry = output<void>();

  protected readonly partial = computed(() => {
    const s = this.state();
    return s.status === 'streaming' ? s.partial : '';
  });
  protected readonly summary = computed(() => {
    const s = this.state();
    return s.status === 'success' ? s.summary : '';
  });
  protected readonly suggestions = computed(() => {
    const s = this.state();
    return s.status === 'success' ? s.suggestions : [];
  });
  protected readonly errorMessage = computed(() => {
    const s = this.state();
    return s.status === 'error' ? s.message : '';
  });

  protected severityColor(sev: AiSeverity): string {
    return SEVERITY_COLOR[sev];
  }
  protected severityIcon(sev: AiSeverity): string {
    return SEVERITY_ICON[sev];
  }
}
