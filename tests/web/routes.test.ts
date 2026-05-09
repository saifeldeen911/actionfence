import { describe, expect, it, vi } from 'vitest';

describe('web metadata routes', () => {
  it('builds robots and sitemap from the site url', async () => {
    vi.stubEnv('SITE_URL', 'https://actionfence.dev');

    const [{ default: robots }, { default: sitemap }] = await Promise.all([
      import('../../apps/web/app/robots'),
      import('../../apps/web/app/sitemap'),
    ]);

    expect(robots()).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
      },
      sitemap: 'https://actionfence.dev/sitemap.xml',
    });
    expect(sitemap()).toEqual([
      {
        url: 'https://actionfence.dev',
        changeFrequency: 'weekly',
        priority: 1,
      },
    ]);

    vi.unstubAllEnvs();
  });

  it('exports opengraph image metadata', async () => {
    const og = await import('../../apps/web/app/opengraph-image');

    expect(og.size).toEqual({ width: 1200, height: 630 });
    expect(og.contentType).toBe('image/png');
    expect(og.alt).toContain('ActionFence');
  });
});
