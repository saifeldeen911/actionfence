import type { Metadata } from "next";
import MarkdownDocument from "@/components/ui/MarkdownDocument";
import { readRepoDoc, repoDocs } from "@/lib/repo-docs";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Changelog | ActionFence",
  description: repoDocs.changelog.description,
};

export default async function ChangelogPage() {
  const source = await readRepoDoc(repoDocs.changelog);

  return <MarkdownDocument doc={repoDocs.changelog} source={source} />;
}

