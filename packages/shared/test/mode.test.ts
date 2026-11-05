import { describe, expect, it } from 'vitest';
import { parseMode } from '../src/index.ts';

describe('parseMode', () => {
  it('accepts the two moods', () => {
    expect(parseMode('serious')).toBe('serious');
    expect(parseMode('playful')).toBe('playful');
  });
  it('falls back to playful for anything else', () => {
    expect(parseMode(undefined)).toBe('playful');
    expect(parseMode('SERIOUS')).toBe('playful');
    expect(parseMode({ $ne: 1 })).toBe('playful');
  });
});
