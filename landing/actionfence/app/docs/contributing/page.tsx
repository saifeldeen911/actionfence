import type { Metadata } from "next";
import MarkdownDocument from "@/components/ui/MarkdownDocument";
import { readRepoDoc, repoDocs } from "@/lib/repo-docs";
import { canonicalPath, canonicalUrl, siteName } from "@/lib/site-config";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Contributing",
  description: repoDocs.contributing.description,
  alternates: {
    canonical: canonicalPath(repoDocs.contributing.route),
  },
  openGraph: {
    url: canonicalUrl(repoDocs.contributing.route),
    title: `Contributing | ${siteName}`,
    description: repoDocs.contributing.description,
  },
  twitter: {
    card: "summary",
    title: `Contributing | ${siteName}`,
    description: repoDocs.contributing.description,
  },
};

export default async function ContributingPage() {
  const source = await readRepoDoc(repoDocs.contributing);

  return <MarkdownDocument source={source} />;
}
