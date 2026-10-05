import 'server-only';

import { env } from '@/lib/env';

/**
 * Public URL for a share token. Built from the configured app origin (required in production)
 * rather than request headers, which a client could spoof. In development without
 * BETTER_AUTH_URL it falls back to a root-relative path.
 */
export function shareUrl(shareToken: string): string {
  const path = `/s/${shareToken}`;
  return env.BETTER_AUTH_URL ? new URL(path, env.BETTER_AUTH_URL).href : path;
}
