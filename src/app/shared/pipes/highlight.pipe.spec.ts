import { describe, expect, it } from 'vitest';
import { HighlightPipe } from './highlight.pipe';

describe('HighlightPipe', () => {
  const pipe = new HighlightPipe();

  it('returns a single unmatched segment when there is no term', () => {
    expect(pipe.transform('Cheeseburger', '')).toEqual([{ text: 'Cheeseburger', match: false }]);
  });

  it('splits around a case-insensitive match', () => {
    expect(pipe.transform('Cheeseburger', 'cheese')).toEqual([
      { text: 'Cheese', match: true },
      { text: 'burger', match: false },
    ]);
  });

  it('marks every occurrence of the term', () => {
    const segments = pipe.transform('aXaXa', 'a');
    expect(segments.filter((s) => s.match).length).toBe(3);
    expect(segments.map((s) => s.text).join('')).toBe('aXaXa');
  });

  it('never loses characters', () => {
    const input = 'Deluxe Four Cheese';
    const rebuilt = pipe.transform(input, 'four').map((s) => s.text).join('');
    expect(rebuilt).toBe(input);
  });
});
