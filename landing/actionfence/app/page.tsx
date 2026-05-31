import type { Metadata } from "next";
import SiteHeader from "@/components/ui/SiteHeader";
import Hero from "@/components/ui/Hero";
import ProblemStatement from "@/components/ui/ProblemStatement";
import HowItWorks from "@/components/ui/HowItWorks";
import FeaturesGrid from "@/components/ui/FeaturesGrid";
import CodeExamples from "@/components/ui/CodeExamples";
import TrustModel from "@/components/ui/TrustModel";
import ReceiptChain from "@/components/ui/ReceiptChain";
import UseCases from "@/components/ui/UseCases";
import Comparison from "@/components/ui/Comparison";
import Footer from "@/components/ui/Footer";
import {
  canonicalPath,
  canonicalUrl,
  siteDescription,
  siteKeywords,
  siteName,
  siteRepoUrl,
  siteTitle,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "AI Action Firewall for MCP and Node.js APIs",
  description:
    "ActionFence adds policy-based controls, spend caps, and signed receipts to MCP servers and Node.js APIs.",
  alternates: {
    canonical: canonicalPath("/"),
  },
  keywords: siteKeywords,
  openGraph: {
    type: "website",
    url: canonicalUrl("/"),
    title: siteTitle,
    description: siteDescription,
    siteName,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareSourceCode",
      "@id": canonicalUrl("/#software-source"),
      name: siteName,
      description: siteDescription,
      url: canonicalUrl("/"),
      codeRepository: siteRepoUrl,
      license: `${siteRepoUrl}/blob/main/LICENSE`,
      programmingLanguage: ["TypeScript", "JavaScript"],
      runtimePlatform: "Node.js >= 20",
      keywords: siteKeywords.join(", "),
      targetProduct: {
        "@type": "SoftwareApplication",
        name: siteName,
        applicationCategory: "DeveloperApplication",
      },
    },
    {
      "@type": "WebSite",
      "@id": canonicalUrl("/#website"),
      url: canonicalUrl("/"),
      name: siteName,
      description: siteDescription,
      inLanguage: "en",
      publisher: {
        "@type": "Organization",
        name: siteName,
        url: canonicalUrl("/"),
      },
    },
  ],
};

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-start overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <SiteHeader variant="landing" />
      <Hero />
      <ProblemStatement />
      <HowItWorks />
      <FeaturesGrid />
      <CodeExamples />
      <TrustModel />
      <ReceiptChain />
      <UseCases />
      <Comparison />
      <Footer />
    </main>
  );
}
