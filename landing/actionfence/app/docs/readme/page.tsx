import type { Metadata } from "next";
import MarkdownDocument from "@/components/ui/MarkdownDocument";
import { readRepoDoc, repoDocs } from "@/lib/repo-docs";
import { canonicalPath, canonicalUrl, siteName } from "@/lib/site-config";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Documentation",
  description: repoDocs.readme.description,
  alternates: {
    canonical: canonicalPath(repoDocs.readme.route),
  },
  openGraph: {
    url: canonicalUrl(repoDocs.readme.route),
    title: `Documentation | ${siteName}`,
    description: repoDocs.readme.description,
  },
  twitter: {
    card: "summary",
    title: `Documentation | ${siteName}`,
    description: repoDocs.readme.description,
  },
};

export default async function ReadmePage() {
  const source = await readRepoDoc(repoDocs.readme);

  return <MarkdownDocument doc={repoDocs.readme} source={source} />;
}
