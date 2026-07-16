import { Pipe, PipeTransform } from '@angular/core';

export interface HighlightSegment {
  readonly text: string;
  readonly match: boolean;
}

/**
 * Splits `text` into matched / unmatched segments for a search term. Returns
 * structured data (not HTML) so the template can render `<mark>` with `@for` —
 * avoiding `innerHTML` and any XSS surface. Pure pipe → memoised by Angular.
 */
@Pipe({ name: 'highlight' })
export class HighlightPipe implements PipeTransform {
  transform(text: string, term: string | null | undefined): HighlightSegment[] {
    const query = term?.trim();
    if (!query) return [{ text, match: false }];

    const segments: HighlightSegment[] = [];
    const lower = text.toLowerCase();
    const needle = query.toLowerCase();
    let i = 0;

    while (i < text.length) {
      const found = lower.indexOf(needle, i);
      if (found === -1) {
        segments.push({ text: text.slice(i), match: false });
        break;
      }
      if (found > i) segments.push({ text: text.slice(i, found), match: false });
      segments.push({ text: text.slice(found, found + needle.length), match: true });
      i = found + needle.length;
    }
    return segments;
  }
}
