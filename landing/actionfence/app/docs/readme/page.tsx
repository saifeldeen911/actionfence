import type { Metadata } from "next";
import MarkdownDocument from "@/components/ui/MarkdownDocument";
import { readRepoDoc, repoDocs } from "@/lib/repo-docs";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Documentation | ActionFence",
  description: repoDocs.readme.description,
};

export default async function ReadmePage() {
  const source = await readRepoDoc(repoDocs.readme);

  return <MarkdownDocument doc={repoDocs.readme} source={source} />;
}

