/**
 * @module middleware/mcp
 * MCP server adapter for ActionFence.
 */

import type { GuardOptions } from '../types/config.js';
import type { RequestContext } from '../core/identity-reader.js';
import { GuardEngine, type GuardErrorBody, type GuardInstance } from './engine.js';

/** Minimal MCP tool result shape used by ActionFence responses. */
export interface McpToolResult {
  readonly content: readonly McpTextContent[];
  readonly structuredContent?: unknown;
  readonly isError?: boolean;
}

export interface McpTextContent {
  readonly type: 'text';
  readonly text: string;
}

/** Tool handler shape used by the MCP TypeScript SDK registerTool API. */
export type McpToolHandler = (
  params: unknown,
  context?: RequestContext,
) => unknown | Promise<unknown>;

/** Minimal server interface required by withGuard(). */
export interface GuardableMcpServer {
  registerTool(name: string, config: unknown, handler: McpToolHandler): unknown;
}

interface PatchedMcpServer extends GuardableMcpServer {
  [PATCH_STATE]?: {
    readonly instance: GuardInstance;
    readonly originalRegisterTool: GuardableMcpServer['registerTool'];
  };
}

const PATCH_STATE: unique symbol = Symbol('actionfence.mcp.patch');

/**
 * Wrap server.registerTool so subsequently registered tools are protected.
 */
export function withGuard<TServer extends GuardableMcpServer>(
  server: TServer,
  options: GuardOptions,
): GuardInstance {
  const patchedServer = server as PatchedMcpServer;

  if (patchedServer[PATCH_STATE]) {
    throw new Error('ActionFence is already installed on this MCP server');
  }

  const engine = new GuardEngine(options);
  const originalRegisterTool = server.registerTool;
  const boundRegisterTool = originalRegisterTool.bind(server);

  server.registerTool = function registerToolWithGuard(
    name: string,
    config: unknown,
    handler: McpToolHandler,
  ): unknown {
    if (config && typeof config === 'object' && 'inputSchema' in config) {
      engine.registerToolSchema(name, config.inputSchema as Record<string, unknown>);
    }

    const guardedHandler: McpToolHandler = async function guardedToolHandler(
      this: unknown,
      params: unknown,
      context?: RequestContext,
    ): Promise<unknown> {
      let result;
      try {
        result = await engine.evaluate({
          toolName: name,
          params,
          context,
        });
      } catch (error: unknown) {
        return toMcpErrorResult(createInternalErrorBody(name, error));
      }

      if (result.mode === 'simulate') {
        return toMcpJsonResult(result.preview, false);
      }

      if (!result.allowed) {
        return toMcpErrorResult(result.error);
      }

      return handler.call(this, params, context);
    };

    return boundRegisterTool(name, config, guardedHandler);
  };

  const instance: GuardInstance = Object.freeze({
    engine,
    dispose: () => {
      server.registerTool = originalRegisterTool;
      engine.dispose();
      Reflect.deleteProperty(patchedServer, PATCH_STATE);
    },
  });

  patchedServer[PATCH_STATE] = {
    instance,
    originalRegisterTool,
  };

  return instance;
}

function toMcpJsonResult(body: unknown, isError: boolean): McpToolResult {
  return Object.freeze({
    content: Object.freeze([
      Object.freeze({
        type: 'text' as const,
        text: JSON.stringify(body),
      }),
    ]),
    structuredContent: body,
    isError,
  });
}

function toMcpErrorResult(body: GuardErrorBody | null): McpToolResult {
  return toMcpJsonResult(
    body ?? {
      error: {
        code: 'ACTIONFENCE_INTERNAL_ERROR',
        message: 'ActionFence blocked execution because enforcement failed',
        action: 'unknown',
        toolName: 'unknown',
        policyRef: 'unknown',
        receiptId: null,
      },
    },
    true,
  );
}

function createInternalErrorBody(toolName: string, error: unknown): GuardErrorBody {
  const message = error instanceof Error ? error.message : String(error);
  return {
    error: {
      code: 'ACTIONFENCE_INTERNAL_ERROR',
      message: `ActionFence enforcement failed closed: ${message}`,
      action: toolName,
      toolName,
      policyRef: 'unknown',
      receiptId: null,
    },
  };
}
