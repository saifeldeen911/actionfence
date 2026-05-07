/**
 * @module middleware/express
 * Express-compatible HTTP middleware adapter for ActionFence.
 */

import type { GuardOptions } from '../types/config.js';
import type { RequestContext } from '../core/identity-reader.js';
import {
  GuardEngine,
  type GuardErrorBody,
  type GuardEvaluationResult,
  type GuardInstance,
} from './engine.js';

/** Minimal Express-compatible request shape. */
export interface GuardHttpRequest {
  readonly method?: string;
  readonly path?: string;
  readonly originalUrl?: string;
  readonly url?: string;
  readonly route?: { readonly path?: string };
  readonly headers?: Record<string, string | string[] | undefined>;
  readonly body?: unknown;
  readonly query?: unknown;
  readonly params?: unknown;
  readonly authInfo?: RequestContext['authInfo'];
}

/** Minimal Express-compatible response shape. */
export interface GuardHttpResponse {
  readonly headersSent?: boolean;
  status(code: number): GuardHttpResponse;
  json?(body: unknown): unknown;
  send?(body: unknown): unknown;
  end?(body: string): unknown;
  set?(field: string, value: string): GuardHttpResponse;
  setHeader?(field: string, value: string): void;
  getHeader?(field: string): unknown;
}

export type GuardNextFunction = (error?: unknown) => void;

export interface GuardHttpMiddleware extends GuardInstance {
  (req: GuardHttpRequest, res: GuardHttpResponse, next: GuardNextFunction): void;
}

/** Sanitized payload evaluated and stored for HTTP requests. */
export interface GuardHttpPayload {
  readonly method: string;
  readonly path: string;
  readonly params: unknown;
  readonly query: unknown;
  readonly body: unknown;
}

/**
 * Create Express-compatible ActionFence middleware.
 */
export function guard(options: GuardOptions): GuardHttpMiddleware {
  const engine = new GuardEngine(options);

  const middleware = ((req, res, next): void => {
    void runGuardMiddleware(engine, req, res, next);
  }) as GuardHttpMiddleware;

  Object.defineProperties(middleware, {
    engine: {
      value: engine,
      enumerable: false,
    },
    dispose: {
      value: () => engine.dispose(),
      enumerable: false,
    },
  });

  return middleware;
}

async function runGuardMiddleware(
  engine: GuardEngine,
  req: GuardHttpRequest,
  res: GuardHttpResponse,
  next: GuardNextFunction,
): Promise<void> {
  try {
    const payload = createHttpPayload(req);
    const result = await engine.evaluate({
      toolName: `${payload.method} ${payload.path}`,
      params: payload,
      context: {
        authInfo: req.authInfo,
        headers: normalizeHeaders(req.headers),
      },
    });

    if (result.mode === 'simulate') {
      setHeader(res, 'X-ActionFence-Simulation', 'true');
      sendJson(res, 200, result.preview);
      return;
    }

    if (!result.allowed) {
      sendJson(res, result.statusCode, result.error);
      return;
    }

    next();
  } catch (error: unknown) {
    if (res.headersSent) {
      next(error);
      return;
    }

    sendJson(res, 503, createInternalErrorBody(error));
  }
}

function createHttpPayload(req: GuardHttpRequest): GuardHttpPayload {
  const method = (req.method ?? 'GET').toUpperCase();
  const path = normalizeHttpPath(req.route?.path ?? req.path ?? req.originalUrl ?? req.url ?? '/');

  return Object.freeze({
    method,
    path,
    params: req.params ?? {},
    query: req.query ?? {},
    body: req.body ?? null,
  });
}

function normalizeHttpPath(path: string): string {
  const queryStart = path.indexOf('?');
  const hashStart = path.indexOf('#');
  const endCandidates = [queryStart, hashStart].filter((index) => index >= 0);
  const end = endCandidates.length > 0 ? Math.min(...endCandidates) : path.length;
  const normalized = path.slice(0, end);
  return normalized.length > 0 ? normalized : '/';
}

function normalizeHeaders(headers: GuardHttpRequest['headers']): RequestContext['headers'] {
  const authorization = headers?.authorization;
  const normalizedAuthorization = Array.isArray(authorization) ? authorization[0] : authorization;

  return normalizedAuthorization ? { authorization: normalizedAuthorization } : {};
}

function sendJson(
  res: GuardHttpResponse,
  statusCode: number,
  body: GuardEvaluationResult['preview'] | GuardErrorBody | null,
): void {
  res.status(statusCode);

  if (res.json) {
    res.json(body);
    return;
  }

  const serialized = JSON.stringify(body);
  if (res.getHeader?.('Content-Type') === undefined) {
    setHeader(res, 'Content-Type', 'application/json; charset=utf-8');
  }

  if (res.send) {
    res.send(serialized);
    return;
  }

  res.end?.(serialized);
}

function setHeader(res: GuardHttpResponse, field: string, value: string): void {
  if (res.setHeader) {
    res.setHeader(field, value);
    return;
  }

  res.set?.(field, value);
}

function createInternalErrorBody(error: unknown): GuardErrorBody {
  const message = error instanceof Error ? error.message : String(error);
  return {
    error: {
      code: 'ACTIONFENCE_INTERNAL_ERROR',
      message: `ActionFence enforcement failed closed: ${message}`,
      action: 'unknown',
      toolName: 'unknown',
      policyRef: 'unknown',
      receiptId: null,
    },
  };
}
