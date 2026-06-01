"use client";

import Link from "next/link";
import SectionShell from "./SectionShell";

const stats = [
  { label: "License", value: "MIT" },
  { label: "Tests", value: "149+ passing" },
  { label: "Security", value: "20 found, 20 resolved" },
  { label: "Node.js", value: "≥ 20" },
  { label: "Storage", value: "SQLite / PostgreSQL" }
];

export default function Footer() {
  return (
    <footer className="w-full flex flex-col">

      {/* Stats Bar */}
      <section className="w-full border-y border-zinc-800 bg-zinc-900/30">
        <SectionShell className="py-0">
          <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-zinc-800">
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col p-5 items-center justify-center text-center">
                <span className="text-xl font-medium text-white tracking-tight md:text-2xl">{stat.value}</span>
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest mt-2">{stat.label}</span>
              </div>
            ))}
          </div>
        </SectionShell>
      </section>

      {/* Final CTA */}
      <section className="w-full py-32 bg-[#09090b]">
        <SectionShell className="flex flex-col items-center justify-center gap-12">
          <h2 className="text-3xl md:text-5xl font-medium tracking-tighter text-center">
            Install ActionFence in under 60 seconds.
          </h2>
          
          <div className="p-8 border border-zinc-800 bg-zinc-950 font-mono text-sm md:text-base text-zinc-300 flex flex-col gap-2 min-w-75 md:min-w-125">
            <div className="flex gap-4">
              <span className="text-zinc-600">$</span>
              <span className="text-white">npm install actionfence</span>
            </div>
            <div className="flex gap-4">
              <span className="text-zinc-600">$</span>
              <span className="text-white">npx actionfence init</span>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 font-mono text-sm text-zinc-500">
            <Link href="/docs/readme" className="hover:text-accent transition-colors outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Read Docs →</Link>
            <Link href="/#examples" className="hover:text-accent transition-colors outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Examples →</Link>
            <a href="https://github.com/saifeldeen911/actionfence" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors outline-none focus-visible:ring-1 focus-visible:ring-accent/60">GitHub →</a>
          </div>
        </SectionShell>
      </section>

      {/* Massive Branding */}
      <div className="w-full overflow-hidden flex items-center justify-center bg-[#09090b] pt-24 pb-4 border-t border-zinc-800 select-none">
        <span aria-hidden="true" className="text-[15vw] font-bold tracking-tighter leading-none text-transparent [-webkit-text-stroke:1px_#7c83ff] md:[-webkit-text-stroke:2px_#7c83ff] opacity-80">
          ACTIONFENCE
        </span>
      </div>

      {/* Actual Footer */}
      <section className="w-full border-t border-zinc-800 py-16 bg-[#09090b]">
        <SectionShell>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 font-mono text-sm">
            <div className="flex flex-col gap-4">
              <span className="text-white">ActionFence</span>
              <span className="text-zinc-500">AI Action Firewall<br/>MIT License<br/>© 2026 Saifeldeen</span>
            </div>
            <div className="flex flex-col gap-4 text-zinc-500">
              <span className="text-accent/75 uppercase tracking-widest text-xs mb-2">Resources</span>
              <Link href="/docs/readme" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Documentation</Link>
              <Link href="/docs/readme#api-reference" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">API Reference</Link>
              <Link href="/docs/changelog" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Changelog</Link>
              <Link href="/docs/security" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Security Policy</Link>
            </div>
            <div className="flex flex-col gap-4 text-zinc-500">
              <span className="text-accent/75 uppercase tracking-widest text-xs mb-2">Community</span>
              <a href="https://github.com/saifeldeen911/actionfence" target="_blank" rel="noopener noreferrer" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">GitHub</a>
              <a href="https://github.com/saifeldeen911/actionfence/issues" target="_blank" rel="noopener noreferrer" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Issues</a>
              <Link href="/docs/contributing" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Contributing</Link>
            </div>
          </div>
        </SectionShell>
      </section>

    </footer>
  );
}
