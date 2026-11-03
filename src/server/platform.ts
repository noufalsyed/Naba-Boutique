// Where the app is running. Netlify runs it as short-lived AWS Lambda functions,
// so there is no shared disk and no long-running process for timers.
// Set PLATFORM=netlify in the Netlify environment variables; the Lambda check is a fallback.
export const onNetlify = process.env.PLATFORM === 'netlify' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
