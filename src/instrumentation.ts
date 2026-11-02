// Background housekeeping inside the single Node process (see instrumentation-node.ts).
// The runtime check must wrap the import directly so the edge bundle drops it.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node');
  }
}
