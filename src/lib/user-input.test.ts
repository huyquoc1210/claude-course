import { describe, expect, it } from 'vitest';
import { NAME_MAX_LENGTH, PROFILE_ERROR_CODES } from '@/lib/auth-limits';
import { parseProfileInput } from '@/lib/user-input';

const signUp = (body: unknown) => parseProfileInput(body, { requireName: true });
const update = (body: unknown) => parseProfileInput(body, { requireName: false });

describe('parseProfileInput', () => {
  it('normalizes the name and trims the email', () => {
    expect(signUp({ name: '  Ada \n  Lovelace ', email: ' ada@example.com ' })).toEqual({
      ok: true,
      data: { name: 'Ada Lovelace', email: 'ada@example.com' },
    });
  });

  it('applies Unicode NFC normalization to names', () => {
    const decomposed = 'Amélie';
    const result = signUp({ name: decomposed });
    expect(result).toEqual({ ok: true, data: { name: 'Amélie' } });
  });

  it.each([
    ['missing', {}],
    ['blank', { name: '   ' }],
    ['not a string', { name: 42 }],
    ['too long', { name: 'a'.repeat(NAME_MAX_LENGTH + 1) }],
    ['containing a bidi override', { name: 'evil‮txt.exe' }],
    ['containing a control character', { name: 'a\u0007b' }],
  ])('rejects a sign-up name that is %s', (_label, body) => {
    expect(signUp(body)).toEqual({ ok: false, code: PROFILE_ERROR_CODES.invalidName });
  });

  it('accepts a name of exactly the maximum length', () => {
    expect(signUp({ name: 'a'.repeat(NAME_MAX_LENGTH) }).ok).toBe(true);
  });

  it('does not require a name when updating a user', () => {
    expect(update({})).toEqual({ ok: true, data: {} });
    expect(update(undefined)).toEqual({ ok: true, data: {} });
  });

  it('still validates a name sent with an update', () => {
    expect(update({ name: '' })).toEqual({ ok: false, code: PROFILE_ERROR_CODES.invalidName });
  });

  it.each([
    ['not a string', 123],
    ['too long', `${'a'.repeat(250)}@example.com`],
  ])('rejects an email that is %s', (_label, email) => {
    expect(signUp({ name: 'Ada', email })).toEqual({
      ok: false,
      code: PROFILE_ERROR_CODES.invalidEmail,
    });
  });

  it.each([['https://example.com/a.png'], [null]])('accepts image %s', (image) => {
    expect(update({ image }).ok).toBe(true);
  });

  it.each([
    ['javascript:alert(1)'],
    ['data:image/png;base64,AAAA'],
    ['http://example.com/a.png'],
    ['not a url'],
  ])('rejects image %s', (image) => {
    expect(update({ image })).toEqual({ ok: false, code: PROFILE_ERROR_CODES.invalidImage });
  });

  it('does not pass the image through to the sanitized data', () => {
    expect(update({ image: 'https://example.com/a.png' })).toEqual({ ok: true, data: {} });
  });
});
