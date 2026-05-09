import { describe, expect, it } from 'vitest';
import { getCodeSampleMeta, getCodeSampleLines } from '../../apps/web/src/lib/code-frame';

describe('code frame helpers', () => {
  it('splits code samples into numbered lines', () => {
    expect(getCodeSampleLines('line one\nline two')).toEqual([
      { number: 1, content: 'line one' },
      { number: 2, content: 'line two' },
    ]);
  });

  it('creates docs-style metadata for each sample kind', () => {
    expect(getCodeSampleMeta('mcp')).toEqual({
      filename: 'server.ts',
      label: 'MCP integration',
    });
    expect(getCodeSampleMeta('express')).toEqual({
      filename: 'middleware.ts',
      label: 'HTTP middleware',
    });
    expect(getCodeSampleMeta('cli')).toEqual({
      filename: 'terminal',
      label: 'Local preview',
    });
  });
});
