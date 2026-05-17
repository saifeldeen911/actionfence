import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function splitCommand(command: string): { exe: string; args: string[] } {
  const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  return {
    exe: parts[0]?.replace(/^"|"$/g, '') || '',
    args: parts.slice(1).map((p) => p.replace(/^"|"$/g, '')),
  };
}

// ---------------------------------------------------------------------------
// Tool fetcher
// ---------------------------------------------------------------------------

export async function fetchMcpTools(command: string): Promise<McpTool[]> {
  const { exe, args } = splitCommand(command);

  if (!exe) {
    return Promise.reject(new Error('Invalid server command'));
  }

  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, {
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    const rl = createInterface({
      input: child.stdout,
      terminal: false,
    });

    const tools: McpTool[] = [];
    let settled = false;

    let stdinWritePending = false;

    function cleanupKill(): void {
      child.removeAllListeners();
      rl.removeAllListeners();
      if (!child.killed) {
        child.kill();
      }
    }

    function resolveOnce(result: McpTool[]): void {
      if (settled) return;
      settled = true;
      if (!stdinWritePending) {
        cleanupKill();
      }
      resolve(result);
    }

    function rejectOnce(err: Error): void {
      if (settled) return;
      settled = true;
      if (!stdinWritePending) {
        cleanupKill();
      }
      reject(err);
    }

    function writeWithCallback(
      id: number,
      method: string,
      params: Record<string, unknown> | undefined,
    ): void {
      const msg: Record<string, unknown> = {
        jsonrpc: '2.0',
        id,
        method,
      };
      if (params) {
        msg.params = params;
      }
      const data = JSON.stringify(msg) + '\n';
      if (!child.stdin.writable) {
        rejectOnce(new Error('stdin not writable'));
        return;
      }
      stdinWritePending = true;
      child.stdin.write(data, (err) => {
        stdinWritePending = false;
        if (err) {
          rejectOnce(err);
        } else if (settled) {
          cleanupKill();
        }
      });
    }

    rl.on('line', (line) => {
      try {
        const msg = JSON.parse(line);

        if (msg.id === 1 && msg.result) {
          writeWithCallback(2, 'tools/list', undefined);
        } else if (msg.id === 2 && msg.result?.tools) {
          resolveOnce(msg.result.tools as McpTool[]);
        } else if (msg.id === 2 && msg.error) {
          rejectOnce(new Error(`MCP error: ${JSON.stringify(msg.error)}`));
        }
      } catch {
        // Ignore non-JSON lines
      }
    });

    child.on('error', (err) => {
      rejectOnce(err);
    });

    child.on('exit', (code) => {
      if (stdinWritePending) {
        return;
      }
      if (code !== 0 && code !== null) {
        rejectOnce(new Error(`Server exited with code ${code}`));
      } else {
        resolveOnce(tools);
      }
    });

    // Send initialization message.
    writeWithCallback(1, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'actionfence-cli',
        version: '0.2.0',
      },
    });
  });
}
