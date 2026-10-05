// Runs once when the server starts, before it handles any request.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvironment } = await import('./instrumentation-node');
    await validateEnvironment();
  }
}
