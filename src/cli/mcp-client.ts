import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export async function fetchMcpTools(command: string): Promise<McpTool[]> {
  return new Promise((resolve, reject) => {
    // Split command into executable and args
    const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const exe = parts[0]?.replace(/^"|"$/g, '') || '';
    const args = parts.slice(1).map((p) => p.replace(/^"|"$/g, ''));

    if (!exe) {
      return reject(new Error('Invalid server command'));
    }

    const child = spawn(exe, args, {
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    const rl = createInterface({
      input: child.stdout,
      terminal: false,
    });

    let tools: McpTool[] = [];
    
    rl.on('line', (line) => {
      try {
        const msg = JSON.parse(line);
        if (msg.id === 1 && msg.result) {
          // Init response
          // Send tools/list
          child.stdin.write(
            JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/list',
            }) + '\n',
          );
        } else if (msg.id === 2 && msg.result?.tools) {
          // Tools list response
          tools = msg.result.tools;
          child.kill();
          resolve(tools);
        }
      } catch {
        // Ignore non-JSON lines
      }
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Server exited with code ${code}`));
      } else {
        resolve(tools);
      }
    });

    // Send init
    child.stdin.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'actionfence-cli',
            version: '0.2.0',
          },
        },
      }) + '\n',
    );
  });
}
