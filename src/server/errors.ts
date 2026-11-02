export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'ERROR',
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new AppError(400, msg, 'BAD_REQUEST', details);
export const unauthorized = (msg = 'Please sign in to continue') => new AppError(401, msg, 'UNAUTHORIZED');
export const forbidden = (msg = 'You do not have permission to do this') => new AppError(403, msg, 'FORBIDDEN');
export const notFound = (what = 'Record') => new AppError(404, `${what} not found`, 'NOT_FOUND');
export const conflict = (msg: string, details?: unknown) => new AppError(409, msg, 'CONFLICT', details);
export const tooMany = (msg = 'Too many attempts. Please wait and try again.') => new AppError(429, msg, 'RATE_LIMITED');
