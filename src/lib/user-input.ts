import { z } from 'zod';
import {
  EMAIL_MAX_LENGTH,
  IMAGE_URL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PROFILE_ERROR_CODES,
} from '@/lib/auth-limits';

// Server-side validation for user profile fields accepted by better-auth (SPEC §11.4).
// better-auth itself enforces neither a name length nor an image URL scheme.

// Control characters and bidi overrides (used to visually spoof names).
const UNSAFE_CHARACTERS = /[\p{Cc}‪-‮⁦-⁩]/u;

const nameSchema = z
  .string()
  .transform((value) => value.normalize('NFC').replace(/\s+/g, ' ').trim())
  .pipe(
    z
      .string()
      .min(1)
      .max(NAME_MAX_LENGTH)
      .refine((value) => !UNSAFE_CHARACTERS.test(value)),
  );

const emailSchema = z.string().trim().max(EMAIL_MAX_LENGTH);

// We never render user images today; if we do, only https URLs are acceptable (no javascript:/data:).
const imageSchema = z
  .url({ protocol: /^https$/ })
  .max(IMAGE_URL_MAX_LENGTH)
  .nullable();

type ProfileErrorCode = (typeof PROFILE_ERROR_CODES)[keyof typeof PROFILE_ERROR_CODES];

type ProfileInputResult =
  | { ok: true; data: { name?: string; email?: string } }
  | { ok: false; code: ProfileErrorCode };

/**
 * Validates the profile fields of a sign-up or update-user request body and returns the
 * sanitized values to write back. `requireName` is true for sign-up.
 */
export function parseProfileInput(
  body: unknown,
  { requireName }: { requireName: boolean },
): ProfileInputResult {
  const input = (body ?? {}) as Record<string, unknown>;
  const data: { name?: string; email?: string } = {};

  if (requireName || input.name !== undefined) {
    const name = nameSchema.safeParse(input.name);
    if (!name.success) return { ok: false, code: PROFILE_ERROR_CODES.invalidName };
    data.name = name.data;
  }

  if (input.email !== undefined) {
    const email = emailSchema.safeParse(input.email);
    if (!email.success) return { ok: false, code: PROFILE_ERROR_CODES.invalidEmail };
    data.email = email.data;
  }

  if (input.image !== undefined && !imageSchema.safeParse(input.image).success) {
    return { ok: false, code: PROFILE_ERROR_CODES.invalidImage };
  }

  return { ok: true, data };
}
