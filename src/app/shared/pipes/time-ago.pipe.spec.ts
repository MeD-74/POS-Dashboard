import { describe, expect, it } from 'vitest';
import { TimeAgoPipe } from './time-ago.pipe';

describe('TimeAgoPipe', () => {
  const pipe = new TimeAgoPipe();
  const now = new Date('2026-07-10T12:00:00Z').getTime();
  const ago = (sec: number) => new Date(now - sec * 1000).toISOString();

  it('returns empty for nullish input', () => {
    expect(pipe.transform(null, now)).toBe('');
    expect(pipe.transform(undefined, now)).toBe('');
  });

  it('says "just now" under 45s', () => {
    expect(pipe.transform(ago(10), now)).toBe('just now');
  });

  it('formats minutes and hours', () => {
    expect(pipe.transform(ago(5 * 60), now)).toBe('5m');
    expect(pipe.transform(ago(2 * 3600), now)).toBe('2h');
  });

  it('formats days', () => {
    expect(pipe.transform(ago(2 * 86400), now)).toBe('2d');
  });
});
