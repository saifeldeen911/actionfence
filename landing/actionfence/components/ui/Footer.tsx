"use client";

import Link from "next/link";
import { useState } from "react";
import SiteContainer from "@/components/ui/SiteContainer";

const stats = [
  { label: "License", value: "MIT" },
  { label: "Tests", value: "149+ passing" },
  { label: "Security", value: "20 found, 20 resolved" },
  { label: "Node.js", value: "≥ 20" },
  { label: "Storage", value: "SQLite / PostgreSQL" }
];

export default function Footer() {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const promptText = `Install and integrate "actionfence" into my current project.\nRead the guide at https://raw.githubusercontent.com/saifeldeen911/actionfence/main/llms-full.txt\nthen: install the package, create a guard-policy.json, and wire up the middleware.`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptText).catch(() => {
      // Ignore clipboard failures in restricted contexts.
    });
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 1500);
  };
  return (
    <footer className="w-full flex flex-col">
      <section className="w-full border-t border-zinc-800 bg-background py-32">
        <SiteContainer className="flex flex-col items-center justify-center gap-16">
          <h2 className="text-center text-4xl font-medium tracking-tighter leading-tight md:text-5xl">
            Built for developers who <span className="text-accent/75">ship fast.</span>
          </h2>

          <div className="relative flex w-full max-w-3xl flex-col overflow-hidden border border-accent/20 bg-[#09090b]">
            <div className="flex items-center justify-between border-b border-accent/20 bg-accent/5 p-4">
              <span className="font-mono text-xs uppercase tracking-widest text-accent/75">AI-Assistant Prompt</span>
              <button 
                onClick={handleCopyPrompt}
                className="font-mono text-xs text-white transition-opacity hover:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
              >
                {copiedPrompt ? "[copied]" : "[copy]"}
              </button>
            </div>
            <div className="p-8 font-mono text-sm leading-relaxed text-zinc-300">
              Install and integrate &quot;actionfence&quot; into my current project.{"\n"}
              Read the guide at https://raw.githubusercontent.com/saifeldeen911/actionfence/main/llms-full.txt{"\n"}
              then: install the package, create a guard-policy.json, and wire up the middleware.
            </div>
          </div>

        </SiteContainer>
      </section>

      <section className="w-full border-t border-zinc-800 bg-zinc-900/30">
        <SiteContainer className="px-0 md:px-0">
          <div className="grid grid-cols-2 divide-x divide-y divide-zinc-800 border-b border-zinc-800 md:grid-cols-5 md:divide-y-0">
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center p-6 text-center">
                <span className="text-2xl font-medium tracking-tight text-white">{stat.value}</span>
                <span className="mt-2 text-xs font-mono uppercase tracking-widest text-zinc-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </SiteContainer>
      </section>

      <section className="w-full bg-[#09090b] py-32">
        <SiteContainer className="flex flex-col items-center justify-center gap-12">
          <h2 className="text-center text-3xl font-medium tracking-tighter md:text-5xl">
            Start protecting your AI agents in 60 seconds.
          </h2>

          <div className="flex min-w-75 flex-col gap-2 border border-zinc-800 bg-zinc-950 p-8 font-mono text-sm text-zinc-300 md:min-w-125 md:text-base">
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
            <Link href="/docs/readme" className="transition-colors hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Read Docs →</Link>
            <Link href="/#examples" className="transition-colors hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Examples →</Link>
            <a href="https://github.com/saifeldeen911/actionfence" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">GitHub →</a>
          </div>
        </SiteContainer>
      </section>

      <div className="w-full overflow-hidden flex items-center justify-center bg-[#09090b] pt-24 pb-4 border-t border-zinc-800 select-none">
        <span aria-hidden="true" className="text-[15vw] font-bold tracking-tighter leading-none text-transparent [-webkit-text-stroke:1px_#7c83ff] md:[-webkit-text-stroke:2px_#7c83ff] opacity-80">
          ACTIONFENCE
        </span>
      </div>

      <section className="w-full border-t border-zinc-800 bg-[#09090b] py-16">
        <SiteContainer>
          <div className="grid grid-cols-1 gap-12 font-mono text-sm md:grid-cols-3">
            <div className="flex flex-col gap-4">
              <span className="text-white">ActionFence</span>
              <span className="text-zinc-500">AI Action Firewall<br />MIT License<br />© 2026 Saifeldeen</span>
            </div>
            <div className="flex flex-col gap-4 text-zinc-500">
              <span className="mb-2 text-xs uppercase tracking-widest text-accent/75">Resources</span>
              <Link href="/docs/readme" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Documentation</Link>
              <Link href="/docs/readme#api-reference" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">API Reference</Link>
              <Link href="/docs/changelog" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Changelog</Link>
              <Link href="/docs/security" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Security Policy</Link>
            </div>
            <div className="flex flex-col gap-4 text-zinc-500">
              <span className="mb-2 text-xs uppercase tracking-widest text-accent/75">Community</span>
              <a href="https://github.com/saifeldeen911/actionfence" target="_blank" rel="noopener noreferrer" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">GitHub</a>
              <a href="https://github.com/saifeldeen911/actionfence/issues" target="_blank" rel="noopener noreferrer" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Issues</a>
              <Link href="/docs/contributing" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Contributing</Link>
            </div>
          </div>
        </SiteContainer>
      </section>
    </footer>
  );
}
