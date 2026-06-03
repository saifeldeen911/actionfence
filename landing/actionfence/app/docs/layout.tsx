import DocsHero from "@/components/ui/DocsHero";
import DocsNav from "@/components/ui/DocsNav";
import SiteHeader from "@/components/ui/SiteHeader";

export default function DocsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-50">
      <SiteHeader variant="docs" />
      <DocsNav />
      <DocsHero />
      {children}
    </main>
  );
}
