import bcrypt from 'bcryptjs';

const COST = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/** At least 8 characters with a letter and a digit. */
export function passwordProblem(p: string): string | null {
  if (p.length < 8) return 'Password must be at least 8 characters';
  if (p.length > 200) return 'Password is too long';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Password must contain letters and numbers';
  return null;
}
