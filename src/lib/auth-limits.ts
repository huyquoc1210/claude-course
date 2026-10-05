// Shared by the server-side auth validation and the auth form (native validation hints,
// error-code → message mapping). No server-only imports: this ships to the client.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 254;
export const IMAGE_URL_MAX_LENGTH = 2048;

/** Error codes returned by our own auth input validation (see user-input.ts). */
export const PROFILE_ERROR_CODES = {
  invalidName: 'INVALID_NAME',
  invalidEmail: 'INVALID_EMAIL',
  invalidImage: 'INVALID_IMAGE',
} as const;
