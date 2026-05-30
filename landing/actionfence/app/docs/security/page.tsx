import type { Metadata } from "next";
import MarkdownDocument from "@/components/ui/MarkdownDocument";
import { readRepoDoc, repoDocs } from "@/lib/repo-docs";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Security Policy | ActionFence",
  description: repoDocs.security.description,
};

export default async function SecurityPage() {
  const source = await readRepoDoc(repoDocs.security);

  return <MarkdownDocument doc={repoDocs.security} source={source} />;
}

