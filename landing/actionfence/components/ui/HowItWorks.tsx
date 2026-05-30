"use client";

import { motion } from "framer-motion";

const steps = [
  {
    num: "01",
    action: "DEFINE",
    title: "Define your policy",
    description: "Write a guard-policy.json that declares which actions are allowed, spend limits, identity requirements, and rate limits.",
  },
  {
    num: "02",
    action: "ENFORCE",
    title: "Wrap your server",
    description: "One call to withGuard() or guard() intercepts every tool invocation and runs it through the full policy pipeline — before your handler executes.",
  },
  {
    num: "03",
    action: "PROVE",
    title: "Every decision is receipted",
    description: "Hash-chained, HMAC-signed, append-only receipts stored in SQLite or PostgreSQL. Tamper-evident proof of every allow and every block.",
  },
];

export default function HowItWorks() {
  return (
    <section className="w-full pt-32 pb-16 flex flex-col gap-16">
      <div className="px-6 md:px-12 max-w-4xl">
        <h2 className="text-4xl md:text-6xl font-medium tracking-tighter leading-[0.95]">
          One line of code.<br />
          <span className="text-zinc-600">Three layers of defense.</span>
        </h2>
      </div>

      <div className="w-full border-y border-zinc-800 bg-background">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
          {steps.map((step, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              key={i}
              className="group flex flex-col p-6 md:p-12 min-h-100 hover:bg-zinc-900/30 transition-colors duration-500"
            >
              <div className="flex justify-between items-start mb-auto">
                <span className="font-mono text-zinc-600 text-sm">{step.num}</span>
                <span className="font-mono text-zinc-500 text-xs px-2 py-1 border border-zinc-800">
                  {step.action}
                </span>
              </div>

              <div className="mt-12 mb-8 h-32 w-full border border-zinc-800 bg-zinc-950/60" aria-hidden="true" />

              <div className="flex flex-col gap-6">
                <h3 className="text-2xl font-medium tracking-tight text-white group-hover:text-zinc-300 transition-colors">
                  {step.title}
                </h3>
                <p className="text-base text-zinc-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
