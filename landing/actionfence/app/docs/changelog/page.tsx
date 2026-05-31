import type { Metadata } from "next";
import MarkdownDocument from "@/components/ui/MarkdownDocument";
import { readRepoDoc, repoDocs } from "@/lib/repo-docs";
import { canonicalPath, canonicalUrl, siteName } from "@/lib/site-config";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Changelog",
  description: repoDocs.changelog.description,
  alternates: {
    canonical: canonicalPath(repoDocs.changelog.route),
  },
  openGraph: {
    url: canonicalUrl(repoDocs.changelog.route),
    title: `Changelog | ${siteName}`,
    description: repoDocs.changelog.description,
  },
  twitter: {
    card: "summary",
    title: `Changelog | ${siteName}`,
    description: repoDocs.changelog.description,
  },
};

export default async function ChangelogPage() {
  const source = await readRepoDoc(repoDocs.changelog);

  return <MarkdownDocument doc={repoDocs.changelog} source={source} />;
}
