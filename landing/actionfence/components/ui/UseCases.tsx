"use client";

import SiteContainer from "@/components/ui/SiteContainer";

const useCases = [
  {
    title: "MCP Server Developers",
    desc: "You build MCP tools that book flights, manage calendars, or query databases. ActionFence ensures no agent overspends, over-queries, or accesses unauthorized tools."
  },
  {
    title: "API Providers",
    desc: "Your REST API is consumed by AI agents. Drop in guard() middleware to enforce spend caps, rate limits, and identity checks on every request — without changing your route handlers."
  },
  {
    title: "Enterprise / Compliance",
    desc: "You need an audit trail for every AI-initiated action in your system. Signed receipts provide tamper-evident proof for compliance, incident response, and regulatory reporting."
  },
  {
    title: "Solo Developers",
    desc: "You're one person shipping an MCP server. npm install actionfence. Write a policy. Done. No enterprise gateways. No container networking. No vendor lock-in."
  }
];

export default function UseCases() {
  return (
    <section className="w-full border-t border-zinc-800 py-32">
      <SiteContainer>
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-12">
          <div className="col-span-1 lg:col-span-4">
            <h2 className="text-4xl font-medium tracking-tighter leading-tight md:text-5xl lg:sticky lg:top-32">
              Built for anyone giving AI agents <span className="text-accent/75">real-world permissions.</span>
            </h2>
          </div>

          <div className="col-span-1 grid grid-cols-1 border-t border-l border-zinc-800 md:grid-cols-2 lg:col-span-8">
            {useCases.map((uc, i) => (
              <div key={i} className="group flex min-h-72 flex-col border-r border-b border-zinc-800 p-8 transition-colors duration-500 hover:bg-zinc-900/30 md:p-10">
                <div className="mb-12 font-mono text-sm text-accent/70">
                  [ UC_{String(i + 1).padStart(2, "0")} ]
                </div>
                <h3 className="mt-auto mb-4 text-2xl font-medium tracking-tight text-zinc-50 transition-colors duration-300 group-hover:text-accent">
                  {uc.title}
                </h3>
                <p className="leading-relaxed text-zinc-400">
                  {uc.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
