import { describe, expect, it } from 'vitest';
import { parseAuthMode } from './mode';

describe('parseAuthMode', () => {
  it('returns sign-up only for an explicit "sign-up"', () => {
    expect(parseAuthMode('sign-up')).toBe('sign-up');
  });

  it.each([[undefined], ['sign-in'], ['admin'], [''], [['sign-up', 'sign-up']]])(
    'falls back to sign-in for %j',
    (value) => {
      expect(parseAuthMode(value)).toBe('sign-in');
    },
  );
});
