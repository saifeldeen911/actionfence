import type { Metadata } from "next";
import MarkdownDocument from "@/components/ui/MarkdownDocument";
import { readRepoDoc, repoDocs } from "@/lib/repo-docs";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Contributing | ActionFence",
  description: repoDocs.contributing.description,
};

export default async function ContributingPage() {
  const source = await readRepoDoc(repoDocs.contributing);

  return <MarkdownDocument doc={repoDocs.contributing} source={source} />;
}

