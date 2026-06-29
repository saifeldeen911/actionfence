"use client";

import SectionShell from "./SectionShell";

const withoutFence = [
  "Any agent can call any tool",
  "No spending visibility",
  "No identity verification",
  "No audit trail",
  "Find out about issues from your invoice",
  "\"I hope the agent behaves\"",
  "Zero configuration for safety"
];

const withFence = [
  "Actions governed by JSON policy",
  "Per-action, session, daily, and rolling-window spend caps",
  "Three-tier identity system with JWKS JWT verification",
  "Hash-chained, signed receipts for every decision",
  "Real-time rate limiting and circuit breaker protection",
  "Server-side enforcement for protected MCP/API calls",
  "One JSON file. One line of code."
];

export default function Comparison() {
  return (
    <section className="w-full py-32 border-t border-zinc-800">
      <SectionShell className="flex flex-col gap-16">
        <h2 className="text-4xl md:text-5xl font-medium tracking-tighter leading-tight text-center">
          What changes when you add ActionFence
        </h2>

        {/* Brutalist Comparison Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 border border-zinc-800">
          
          {/* Left: Without */}
          <div className="flex flex-col bg-zinc-900/30">
            <div className="p-6 md:p-8 border-b border-zinc-800 bg-[#09090b]">
              <span className="font-mono text-zinc-500 text-sm">WITHOUT ACTIONFENCE</span>
            </div>
            <ul className="flex flex-col divide-y divide-zinc-800/50">
              {withoutFence.map((item, i) => (
                <li key={i} className="p-6 md:p-8 flex gap-4 text-zinc-500">
                  <span className="font-mono shrink-0">{"[-] "}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: With */}
          <div className="flex flex-col border-t md:border-t-0 md:border-l border-zinc-800 bg-[#09090b]">
            <div className="p-6 md:p-8 border-b border-zinc-800">
              <span className="font-mono text-white text-sm">WITH ACTIONFENCE</span>
            </div>
            <ul className="flex flex-col divide-y divide-zinc-800">
              {withFence.map((item, i) => (
                <li key={i} className="p-6 md:p-8 flex gap-4 text-zinc-100">
                  <span className="font-mono shrink-0">{"[+] "}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </SectionShell>
    </section>
  );
}
