 
"use client";

import { motion } from "framer-motion";
import SectionShell from "./SectionShell";
import TrustModelDiagram from "./TrustModelDiagram";

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
          Server-side enforcement. <span className="text-accent">Not a client-side suggestion.</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          
          {/* Comparison Lists */}
          <div className="flex flex-col gap-12">
            
            {/* How others do it */}
            <div className="flex flex-col gap-6">
              <div className="text-sm font-mono text-accent uppercase tracking-widest pb-4 border-b border-zinc-800">
                How Others Do It
              </div>
              <ul className="flex flex-col gap-4">
                {others.map((item, i) => (
                  <li key={i} className="flex items-start gap-4 text-subtle">
                    <span className="font-mono text-accent">{"[X]"}</span>
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

          {/* Diagram Section */}
          <TrustModelDiagram />
        </div>
      </SectionShell>
    </section>
  );
}
