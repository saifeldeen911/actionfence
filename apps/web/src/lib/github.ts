const DEFAULT_REPO = 'saifeldeen911/actionfence';
const GITHUB_API_BASE = 'https://api.github.com/repos';
const REVALIDATE_SECONDS = 3600;

export interface GitHubRepoStats {
  stars: number | null;
  repoUrl: string;
}

function getRepoSlug(): string {
  return process.env.GITHUB_REPO?.trim() || DEFAULT_REPO;
}

function getRepoUrl(repoSlug: string): string {
  return `https://github.com/${repoSlug}`;
}

export async function getGitHubRepoStats(): Promise<GitHubRepoStats> {
  const repoSlug = getRepoSlug();
  const repoUrl = getRepoUrl(repoSlug);
  const token = process.env.GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${GITHUB_API_BASE}/${repoSlug}`, {
      headers,
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return { stars: null, repoUrl };
    }

    const payload = (await response.json()) as {
      html_url?: string;
      stargazers_count?: number;
    };

    return {
      stars: typeof payload.stargazers_count === 'number' ? payload.stargazers_count : null,
      repoUrl: payload.html_url || repoUrl,
    };
  } catch {
    return { stars: null, repoUrl };
  }
}
