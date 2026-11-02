// Loads .env for command-line scripts (Next.js loads it itself for the app).
// Import this first so later imports see the variables.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file: rely on the real environment (production).
}
