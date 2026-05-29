"use client";

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
    <section className="w-full px-6 md:px-12 py-32 border-t border-zinc-800">
      <div className="flex flex-col gap-16 max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-medium tracking-tighter leading-tight text-center max-w-3xl mx-auto">
          Built for anyone giving AI agents <span className="text-zinc-600">real-world permissions.</span>
        </h2>

        {/* 2x2 Brutalist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 border-l border-t border-zinc-800">
          {useCases.map((uc, i) => (
            <div key={i} className="flex flex-col p-8 md:p-12 border-r border-b border-zinc-800 hover:bg-zinc-900/30 transition-colors">
              <div className="font-mono text-zinc-600 text-sm mb-12">
                [ UC_{String(i + 1).padStart(2, "0")} ]
              </div>
              <h3 className="text-2xl font-medium tracking-tight text-white mb-4">
                {uc.title}
              </h3>
              <p className="text-zinc-400 leading-relaxed">
                {uc.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
