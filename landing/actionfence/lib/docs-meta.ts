export type RepoDocMeta = {
  title: string;
  description: string;
  fileName: string;
  route: string;
};

export const repoDocMeta = {
  readme: {
    title: "Documentation",
    description: "Install, integrate, and operate ActionFence.",
    fileName: "README.md",
    route: "/docs/readme",
  },
  changelog: {
    title: "Changelog",
    description: "Release notes, fixes, and security changes.",
    fileName: "CHANGELOG.md",
    route: "/docs/changelog",
  },
  security: {
    title: "Security Policy",
    description: "Supported versions and vulnerability reporting.",
    fileName: "SECURITY.md",
    route: "/docs/security",
  },
  contributing: {
    title: "Contributing",
    description: "Development workflow and pull request expectations.",
    fileName: "CONTRIBUTING.md",
    route: "/docs/contributing",
  },
} as const satisfies Record<string, RepoDocMeta>;

export const repoDocMetaList = Object.values(repoDocMeta);

export function getRepoDocMetaByRoute(route: string): RepoDocMeta {
  return repoDocMetaList.find((doc) => doc.route === route) ?? repoDocMeta.readme;
}
