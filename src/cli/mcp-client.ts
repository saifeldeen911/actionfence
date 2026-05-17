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

function writeMessage(
  stdin: NodeJS.WritableStream,
  id: number,
  method: string,
  params: Record<string, unknown> | undefined,
  onError?: (err: Error) => void,
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
  if (!stdin.writable) {
    onError?.(new Error('stdin not writable'));
    return;
  }
  stdin.write(data, (err) => {
    if (err) onError?.(err);
  });
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

    function resolveOnce(result: McpTool[]): void {
      if (settled) return;
      settled = true;
      cleanupKill(result);
      resolve(result);
    }

    function rejectOnce(err: Error): void {
      if (settled) return;
      settled = true;
      cleanupKill([]);
      reject(err);
    }

    function cleanupKill(_finalTools: McpTool[]): void {
      // Prevent 'exit' handler from firing after we already settled.
      child.removeAllListeners();
      rl.removeAllListeners();
      if (!child.killed) {
        child.kill();
      }
    }

    rl.on('line', (line) => {
      try {
        const msg = JSON.parse(line);

        if (msg.id === 1 && msg.result) {
          // Init response — request tools list
          writeMessage(child.stdin, 2, 'tools/list', undefined, rejectOnce);
        } else if (msg.id === 2 && msg.result?.tools) {
          // Tools list response
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
      if (code !== 0 && code !== null) {
        rejectOnce(new Error(`Server exited with code ${code}`));
      } else {
        // If the process exit naturally before json tools list was produced.
        resolveOnce(tools);
      }
    });

    // Send initialization message.
    writeMessage(child.stdin, 1, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'actionfence-cli',
        version: '0.2.0',
      },
    }, rejectOnce);
  });
}
