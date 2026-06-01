/* eslint-disable react/no-unescaped-entities */
"use client";

import { motion } from "framer-motion";
import SectionShell from "./SectionShell";

const others = [
  "Client-side checks can be bypassed or skipped",
  "Rules can drift across services and environments",
  "\"Please don't do bad things\" approach",
  "No consistent deny-by-default behavior"
];

const us = [
  "One policy gate executes before every tool handler",
  "Agent never sees guard-policy.json",
  "All tool calls must pass through middleware",
  "Blocked requests never reach execution code",
  "Default rule: deny. Allowlist only."
];

export default function TrustModel() {
  return (
    <section className="w-full py-32 border-t border-zinc-800 bg-background">
      <SectionShell className="flex flex-col gap-24">
        
        <h2 className="text-4xl md:text-5xl font-medium tracking-tighter leading-tight max-w-4xl">
          Server-side enforcement. <span className="text-accent/75">Not a client-side suggestion.</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          
          {/* Comparison Lists */}
          <div className="flex flex-col gap-12">
            
            {/* How others do it */}
            <div className="flex flex-col gap-6">
              <div className="text-sm font-mono text-accent/75 uppercase tracking-widest pb-4 border-b border-zinc-800">
                How Others Do It
              </div>
              <ul className="flex flex-col gap-4">
                {others.map((item, i) => (
                  <li key={i} className="flex items-start gap-4 text-zinc-500">
                    <span className="font-mono text-accent/50">{"[X]"}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* How ActionFence does it */}
            <div className="flex flex-col gap-6">
              <div className="text-sm font-mono text-accent uppercase tracking-widest pb-4 border-b border-zinc-800">
                How ActionFence Does It
              </div>
              <ul className="flex flex-col gap-4">
                {us.map((item, i) => (
                  <motion.li 
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    key={i} 
                    className="flex items-start gap-4 text-zinc-100"
                  >
                    <span className="font-mono text-accent">{"[+]"}</span>
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

          </div>

          {/* Wireframe Diagram */}
          <div className="relative w-full aspect-square md:aspect-4/3 lg:aspect-auto lg:h-150 border border-zinc-800 flex items-center justify-center p-8 bg-[#09090b]">
            {/* Background grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />

            {/* Diagram Elements */}
            <div className="relative z-10 w-full h-full flex flex-col md:flex-row items-center justify-between gap-8">
              
              {/* Agent Node */}
              <motion.div 
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="w-full md:w-32 aspect-square border border-zinc-700 bg-zinc-900/80 flex flex-col items-center justify-center gap-2"
              >
                <div className="font-mono text-zinc-500 text-xs">SOURCE</div>
                <div className="font-medium text-zinc-300">AI Agent</div>
              </motion.div>

              {/* Connecting path */}
              <div className="hidden md:flex flex-1 h-px bg-zinc-800 relative">
                <div className="absolute top-1/2 -translate-y-1/2 left-4 text-xs font-mono text-zinc-500 bg-[#09090b] px-2">
                  REQUEST
                </div>
              </div>

              {/* ActionFence Wall Node */}
              <div className="w-full md:w-48 py-12 border border-accent/35 bg-accent/8 flex flex-col items-center justify-center gap-2 relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-xs text-zinc-500">
                  GUARD-POLICY.JSON
                </div>
                <div className="font-mono text-accent/75 text-xs uppercase tracking-widest">ENFORCEMENT</div>
                <div className="font-bold text-zinc-50 text-xl tracking-tighter">ActionFence</div>
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-accent/60">
                  deny by default
                </div>
              </div>

              {/* Connecting path */}
              <div className="hidden md:flex flex-1 h-px bg-zinc-800 relative">
                <div className="absolute top-1/2 -translate-y-1/2 right-4 text-xs font-mono text-zinc-500 bg-[#09090b] px-2">
                  AUTHORIZED
                </div>
              </div>

              {/* Tools/Server Node */}
              <motion.div 
                className="w-full md:w-32 aspect-square border border-zinc-700 bg-zinc-900/80 flex flex-col items-center justify-center gap-2"
              >
                <div className="font-mono text-zinc-500 text-xs">TARGET</div>
                <div className="font-medium text-zinc-300">MCP Tools</div>
              </motion.div>

            </div>

            {/* Callout lines */}
            <div className="absolute bottom-12 left-12 right-12 hidden md:flex justify-between font-mono text-xs text-zinc-600">
              <div className="flex flex-col gap-1 max-w-37.5">
                <span>← Can't read policy</span>
              </div>
              <div className="flex flex-col gap-1 items-center">
                <span>Must pass through ↑</span>
              </div>
              <div className="flex flex-col gap-1 items-end max-w-37.5 text-right">
                <span>Only approved calls continue →</span>
              </div>
            </div>

          </div>
        </div>
      </SectionShell>
    </section>
  );
}
