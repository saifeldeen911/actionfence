import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGitHubRepoStats } from '../../apps/web/src/lib/github';

describe('getGitHubRepoStats', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns the stargazer count from GitHub and revalidates the response', async () => {
    vi.stubEnv('GITHUB_REPO', 'saifeldeen911/actionfence');
    vi.stubEnv('GITHUB_TOKEN', 'secret-token');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stargazers_count: 42,
        html_url: 'https://github.com/saifeldeen911/actionfence',
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await getGitHubRepoStats();

    expect(result).toEqual({
      stars: 42,
      repoUrl: 'https://github.com/saifeldeen911/actionfence',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/saifeldeen911/actionfence',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer secret-token',
        }),
        next: { revalidate: 3600 },
      }),
    );
  });

  it('falls back to the repo URL when GitHub is unavailable', async () => {
    vi.stubEnv('GITHUB_REPO', 'saifeldeen911/actionfence');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      }),
    );

    const result = await getGitHubRepoStats();

    expect(result).toEqual({
      stars: null,
      repoUrl: 'https://github.com/saifeldeen911/actionfence',
    });
  });
});
