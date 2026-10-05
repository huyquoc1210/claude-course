// Node.js-only startup checks (kept out of instrumentation.ts, which is also compiled for Edge).

export async function validateEnvironment() {
  try {
    // Throws if required variables are missing/invalid in production (see lib/env.ts).
    await import('./lib/env');
  } catch (error) {
    // Exit instead of serving 500s, so the failure is obvious and orchestrators can react.
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
