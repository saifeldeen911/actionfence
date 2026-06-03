import { readFile } from "node:fs/promises";
import path from "node:path";
import { repoDocMeta, type RepoDocMeta } from "@/lib/docs-meta";

export type RepoDoc = RepoDocMeta & {
  sourcePath: string;
};

export const repoDocs = {
  readme: {
    ...repoDocMeta.readme,
    sourcePath: path.resolve(process.cwd(), "../../README.md"),
  },
  changelog: {
    ...repoDocMeta.changelog,
    sourcePath: path.resolve(process.cwd(), "../../CHANGELOG.md"),
  },
  security: {
    ...repoDocMeta.security,
    sourcePath: path.resolve(process.cwd(), "../../SECURITY.md"),
  },
  contributing: {
    ...repoDocMeta.contributing,
    sourcePath: path.resolve(process.cwd(), "../../CONTRIBUTING.md"),
  },
} satisfies Record<string, RepoDoc>;

export async function readRepoDoc(doc: RepoDoc): Promise<string> {
  return readFile(doc.sourcePath, "utf8");
}
