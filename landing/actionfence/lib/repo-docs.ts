import { readFile } from "node:fs/promises";
import path from "node:path";

export type RepoDoc = {
  title: string;
  description: string;
  fileName: string;
  route: string;
  sourcePath: string;
};

export const repoDocs = {
  readme: {
    title: "Documentation",
    description: "Install, integrate, and operate ActionFence.",
    fileName: "README.md",
    route: "/docs/readme",
    sourcePath: path.resolve(process.cwd(), "../../README.md"),
  },
  changelog: {
    title: "Changelog",
    description: "Release notes, fixes, and security changes.",
    fileName: "CHANGELOG.md",
    route: "/docs/changelog",
    sourcePath: path.resolve(process.cwd(), "../../CHANGELOG.md"),
  },
  security: {
    title: "Security Policy",
    description: "Supported versions and vulnerability reporting.",
    fileName: "SECURITY.md",
    route: "/docs/security",
    sourcePath: path.resolve(process.cwd(), "../../SECURITY.md"),
  },
  contributing: {
    title: "Contributing",
    description: "Development workflow and pull request expectations.",
    fileName: "CONTRIBUTING.md",
    route: "/docs/contributing",
    sourcePath: path.resolve(process.cwd(), "../../CONTRIBUTING.md"),
  },
} satisfies Record<string, RepoDoc>;

export async function readRepoDoc(doc: RepoDoc): Promise<string> {
  return readFile(doc.sourcePath, "utf8");
}
