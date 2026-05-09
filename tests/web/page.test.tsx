import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../apps/web/src/lib/github', () => ({
  getGitHubRepoStats: vi.fn().mockResolvedValue({
    stars: 128,
    repoUrl: 'https://github.com/saifeldeen911/actionfence',
  }),
}));

describe('web landing page', () => {
  beforeEach(() => {
    vi.stubEnv('SITE_URL', 'https://actionfence.dev');
  });

  it('renders key marketing sections on the server', async () => {
    const { default: HomePage } = await import('../../apps/web/app/page');

    const markup = extractText(await HomePage());

    expect(markup).toContain('Guard agent actions before they execute');
    expect(markup).toContain('Why teams use ActionFence');
    expect(markup).toContain('How it works');
    expect(markup).toContain('Ship in one package');
    expect(markup).toContain('Signed receipts');
    expect(markup).toContain('MCP Server');
    expect(markup).toContain('Express / Fastify');
    expect(markup).toContain('CLI');
  });

  it('exposes the star count in rendered hero content', async () => {
    const { default: HomePage } = await import('../../apps/web/app/page');

    const markup = extractText(await HomePage());

    expect(markup).toContain('128');
    expect(markup).toContain('GitHub stars');
  });

  it('removes the old hero overlay copy', async () => {
    const { default: HomePage } = await import('../../apps/web/app/page');

    const markup = extractText(await HomePage());

    expect(markup).not.toContain('Security geometry');
  });
});

function extractText(node: unknown): string {
  if (node == null || typeof node === 'boolean') {
    return '';
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(extractText).join(' ');
  }

  if (typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: Record<string, unknown> }).props ?? {};
    return Object.values(props).map(extractText).join(' ');
  }

  return '';
}
