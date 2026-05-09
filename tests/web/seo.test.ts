import { describe, expect, it, vi } from 'vitest';
import { buildSoftwareSourceCodeJsonLd, createSiteMetadata, getSiteUrl } from '../../apps/web/src/lib/seo';

describe('web seo helpers', () => {
  it('prefers SITE_URL and trims trailing slashes', () => {
    vi.stubEnv('SITE_URL', 'https://actionfence.dev/');

    expect(getSiteUrl()).toBe('https://actionfence.dev');

    vi.unstubAllEnvs();
  });

  it('builds metadata with canonical and open graph URLs', () => {
    vi.stubEnv('SITE_URL', 'https://actionfence.dev');

    const metadata = createSiteMetadata();

    expect(metadata.metadataBase?.toString()).toBe('https://actionfence.dev/');
    expect(metadata.alternates?.canonical).toBe('/');
    expect(metadata.openGraph?.images?.[0]?.url).toBe('/opengraph-image');
    expect(metadata.twitter?.card).toBe('summary_large_image');

    vi.unstubAllEnvs();
  });

  it('builds software source code json-ld for the package', () => {
    const jsonLd = buildSoftwareSourceCodeJsonLd();

    expect(jsonLd['@type']).toBe('SoftwareSourceCode');
    expect(jsonLd.name).toBe('ActionFence');
    expect(jsonLd.codeRepository).toBe('https://github.com/saifeldeen911/actionfence');
    expect(jsonLd.programmingLanguage).toContain('TypeScript');
  });
});
