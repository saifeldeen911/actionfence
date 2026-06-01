"use client";

import SectionShell from "./SectionShell";

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
    <section className="w-full py-32 border-t border-zinc-800">
      <SectionShell>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12">
        <div className="col-span-1 lg:col-span-4">
          <h2 className="text-4xl md:text-5xl font-medium tracking-tighter leading-tight lg:sticky lg:top-32">
            Built for anyone giving AI agents <span className="text-accent/75">real-world permissions.</span>
          </h2>
        </div>

        {/* 2x2 Brutalist Grid */}
        <div className="col-span-1 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 border-l border-t border-zinc-800">
          {useCases.map((uc, i) => (
            <div key={i} className="group flex min-h-72 flex-col p-8 md:p-10 border-r border-b border-zinc-800 hover:bg-zinc-900/30 transition-colors duration-500">
              <div className="font-mono text-accent/70 text-sm mb-12">
                [ UC_{String(i + 1).padStart(2, "0")} ]
              </div>
              <h3 className="mt-auto text-2xl font-medium tracking-tight text-zinc-50 mb-4 transition-colors duration-300 group-hover:text-accent">
                {uc.title}
              </h3>
              <p className="text-zinc-400 leading-relaxed">
                {uc.desc}
              </p>
            </div>
          ))}
        </div>
        </div>
      </SectionShell>
    </section>
  );
}
