import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError, type ZodType, type ZodTypeDef } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError, forbidden, unauthorized } from '@/server/errors';
import { getAdmin, type AdminAuth } from '@/server/auth/session';
import { onNetlify } from '@/server/platform';

type Schema<T> = ZodType<T, ZodTypeDef, unknown>;

export interface PublicContext<P> {
  req: NextRequest;
  params: P;
  ip: string;
  body: <T>(schema: Schema<T>) => Promise<T>;
  query: <T>(schema: Schema<T>) => T;
}

export interface AdminContext<P> extends PublicContext<P> {
  admin: AdminAuth;
}

type RouteArgs<P> = { params: Promise<P> };

// The header the proxy in front sets (and overwrites if a visitor sends it):
// Nginx sets X-Real-IP; Netlify sets X-Nf-Client-Connection-Ip.
const IP_HEADER = onNetlify ? 'x-nf-client-connection-ip' : 'x-real-ip';

export function clientIp(headers: Pick<Headers, 'get'>): string {
  return headers.get(IP_HEADER) || headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
}

export function errorResponse(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json({ error: { message: err.message, code: err.code, details: err.details } }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    const first = err.issues[0];
    const label = first?.path.length ? `${first.path.join('.')}: ` : '';
    return NextResponse.json({ error: { message: `${label}${first?.message ?? 'Invalid input'}`, code: 'VALIDATION', details: fields } }, { status: 400 });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | string | undefined) ?? '';
      return NextResponse.json({ error: { message: `A record with this ${String(target)} already exists`, code: 'DUPLICATE' } }, { status: 409 });
    }
    if (err.code === 'P2025') return NextResponse.json({ error: { message: 'Record not found', code: 'NOT_FOUND' } }, { status: 404 });
    if (err.code === 'P2003') {
      return NextResponse.json({ error: { message: 'This record is used by other records and cannot be removed', code: 'IN_USE' } }, { status: 409 });
    }
  }
  console.error('[api]', err);
  return NextResponse.json({ error: { message: 'Something went wrong. Please try again.', code: 'SERVER_ERROR' } }, { status: 500 });
}

function bodyParser(req: NextRequest) {
  return async <T,>(schema: Schema<T>) => {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      throw new AppError(400, 'Request body must be valid JSON', 'BAD_JSON');
    }
    return schema.parse(raw);
  };
}

const queryParser = (req: NextRequest) => <T,>(schema: Schema<T>) => schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));

const toResponse = (result: unknown) => (result instanceof Response ? result : NextResponse.json({ data: result ?? null }));

function baseContext<P>(req: NextRequest, params: P): PublicContext<P> {
  return { req, params, ip: clientIp(req.headers), body: bodyParser(req), query: queryParser(req) };
}

export function publicApi<P = Record<string, string>>(handler: (ctx: PublicContext<P>) => Promise<unknown>) {
  return async (req: NextRequest, args: RouteArgs<P>) => {
    try {
      return toResponse(await handler(baseContext(req, (await args?.params) ?? ({} as P))));
    } catch (err) {
      return errorResponse(err);
    }
  };
}

/** Staff API route. `role: 'ADMIN'` excludes cashiers. */
export function adminApi<P = Record<string, string>>(role: 'ADMIN' | 'ANY', handler: (ctx: AdminContext<P>) => Promise<unknown>) {
  return async (req: NextRequest, args: RouteArgs<P>) => {
    try {
      const admin = await getAdmin();
      if (!admin) throw unauthorized();
      if (role === 'ADMIN' && admin.role !== 'ADMIN') throw forbidden();
      return toResponse(await handler({ ...baseContext(req, (await args?.params) ?? ({} as P)), admin }));
    } catch (err) {
      return errorResponse(err);
    }
  };
}
