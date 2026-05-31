import type { Metadata } from "next";
import MarkdownDocument from "@/components/ui/MarkdownDocument";
import { readRepoDoc, repoDocs } from "@/lib/repo-docs";
import { canonicalPath, canonicalUrl, siteName } from "@/lib/site-config";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Security Policy",
  description: repoDocs.security.description,
  alternates: {
    canonical: canonicalPath(repoDocs.security.route),
  },
  openGraph: {
    url: canonicalUrl(repoDocs.security.route),
    title: `Security Policy | ${siteName}`,
    description: repoDocs.security.description,
  },
  twitter: {
    card: "summary",
    title: `Security Policy | ${siteName}`,
    description: repoDocs.security.description,
  },
};

export default async function SecurityPage() {
  const source = await readRepoDoc(repoDocs.security);

  return <MarkdownDocument doc={repoDocs.security} source={source} />;
}
