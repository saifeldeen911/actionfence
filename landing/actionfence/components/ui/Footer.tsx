"use client";

import { motion } from "framer-motion";
import { useState } from "react";

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
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 1500);
  };
  return (
    <footer className="w-full flex flex-col">
      
      {/* Pre-footer: Dev Experience & LLM Box */}
      <section className="w-full px-6 md:px-12 py-32 border-t border-zinc-800 bg-background flex flex-col items-center justify-center gap-16">
        <h2 className="text-4xl md:text-5xl font-medium tracking-tighter leading-tight text-center">
          Built for developers who <span className="text-zinc-600">ship fast.</span>
        </h2>
        
        {/* LLM Prompt Box */}
        <div className="w-full max-w-3xl border border-zinc-800 bg-[#09090b] flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-zinc-700" />
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/30">
            <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest pl-2">AI-Assistant Prompt</span>
            <button 
              onClick={handleCopyPrompt}
              className="font-mono text-xs text-white hover:opacity-50 transition-opacity"
            >
              {copiedPrompt ? "[ COPIED ]" : "[ COPY ]"}
            </button>
          </div>
          <div className="p-8 font-mono text-sm leading-relaxed text-zinc-300">
            Install and integrate "actionfence" into my current project.{"\n"}
            Read the guide at https://raw.githubusercontent.com/saifeldeen911/actionfence/main/llms-full.txt{"\n"}
            then: install the package, create a guard-policy.json, and wire up the middleware.
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="w-full border-t border-zinc-800 bg-zinc-900/30">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-zinc-800 border-b border-zinc-800">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col p-6 items-center justify-center text-center">
              <span className="text-2xl font-medium text-white tracking-tight">{stat.value}</span>
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest mt-2">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full py-32 px-6 flex flex-col items-center justify-center gap-12 bg-[#09090b]">
        <h2 className="text-3xl md:text-5xl font-medium tracking-tighter text-center">
          Start protecting your AI agents in 60 seconds.
        </h2>
        
        <div className="p-8 border border-zinc-800 bg-black font-mono text-sm md:text-base text-zinc-300 flex flex-col gap-2 min-w-[300px] md:min-w-[500px]">
          <div className="flex gap-4">
            <span className="text-zinc-600">$</span>
            <span className="text-white">npm install actionfence</span>
          </div>
          <div className="flex gap-4">
            <span className="text-zinc-600">$</span>
            <span className="text-white">npx actionfence init</span>
          </div>
        </div>
        
        <div className="flex gap-8 font-mono text-sm text-zinc-500">
          <a href="#" className="hover:text-white transition-colors">Read Docs →</a>
          <a href="#" className="hover:text-white transition-colors">Examples →</a>
          <a href="#" className="hover:text-white transition-colors">GitHub →</a>
        </div>
      </section>

      {/* Massive Branding */}
      <div className="w-full overflow-hidden flex items-center justify-center bg-[#09090b] pt-24 pb-4 border-t border-zinc-800 select-none">
        <span className="text-[15vw] font-bold tracking-tighter leading-none text-transparent [-webkit-text-stroke:1px_#3f3f46] md:[-webkit-text-stroke:2px_#3f3f46] opacity-80">
          ACTIONFENCE
        </span>
      </div>

      {/* Actual Footer */}
      <section className="w-full border-t border-zinc-800 px-6 md:px-12 py-16 bg-[#09090b]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 font-mono text-sm">
          <div className="flex flex-col gap-4">
            <span className="text-white">ActionFence</span>
            <span className="text-zinc-500">AI Action Firewall<br/>MIT License<br/>© 2026 Saifeldeen</span>
          </div>
          <div className="flex flex-col gap-4 text-zinc-500">
            <span className="text-zinc-300 uppercase tracking-widest text-xs mb-2">Resources</span>
            <a href="#" className="hover:text-white">Documentation</a>
            <a href="#" className="hover:text-white">API Reference</a>
            <a href="#" className="hover:text-white">Changelog</a>
            <a href="#" className="hover:text-white">Security Policy</a>
          </div>
          <div className="flex flex-col gap-4 text-zinc-500">
            <span className="text-zinc-300 uppercase tracking-widest text-xs mb-2">Community</span>
            <a href="#" className="hover:text-white">GitHub</a>
            <a href="#" className="hover:text-white">Issues</a>
            <a href="#" className="hover:text-white">Contributing</a>
          </div>
        </div>
      </section>

    </footer>
  );
}
