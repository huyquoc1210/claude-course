import { createAuthClient } from 'better-auth/react';

// Same-origin client: baseURL defaults to the current window origin.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
