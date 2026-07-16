/**
 * Domain model for the AI Order Assistant.
 *
 * The assistant is modelled as an explicit finite state machine so the UI can
 * render a distinct, tested view for every async outcome (loading, streaming,
 * success, error) rather than juggling loose booleans.
 */

export type AiSuggestionKind =
  | 'upsell'
  | 'allergy-warning'
  | 'missing-info'
  | 'delivery-risk'
  | 'kitchen-overload';

export type AiSeverity = 'info' | 'warning' | 'critical';

export interface AiSuggestion {
  readonly kind: AiSuggestionKind;
  readonly severity: AiSeverity;
  readonly title: string;
  readonly detail: string;
}

/**
 * Discriminated union = the state machine. Every consumer must handle each
 * `status`, which is exactly the guarantee the challenge asks for
 * ("gracefully handle every state").
 */
export type AiAssistantState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | {
      readonly status: 'streaming';
      /** Partial text accumulated so far (simulated token streaming). */
      readonly partial: string;
    }
  | {
      readonly status: 'success';
      readonly suggestions: readonly AiSuggestion[];
      /** Full streamed narrative, retained for display. */
      readonly summary: string;
      readonly receivedAt: string;
    }
  | {
      readonly status: 'error';
      readonly message: string;
      /** How many automatic retries have already been attempted. */
      readonly attempts: number;
    };

export const AI_IDLE: AiAssistantState = { status: 'idle' };
