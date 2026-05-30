"use client";

import { motion } from "framer-motion";

const features = [
  {
    title: "JSON Policy Engine",
    description: "Declarative rules in guard-policy.json. Allow, deny, require identity, set spend caps — all in one file. Supports wildcard matching (book_*) and hot-reload on change.",
    colSpan: "md:col-span-2",
  },
  {
    title: "Multi-Layer Spend Caps",
    description: "Per-action, Session, Daily, Rolling Window, and Global Circuit Breaker. Stop death-by-a-thousand-cuts. A 60-minute rolling window catches fragmented micro-spending that per-call limits miss.",
    colSpan: "md:col-span-2",
  },
  {
    title: "Identity & JWT Verification",
    description: "Three tiers: anonymous → token → verified. Built-in JWKS verification.",
    colSpan: "md:col-span-1",
  },
  {
    title: "Signed Receipt Chain",
    description: "Cryptographic proof of every decision. HMAC-SHA256 signed. Hash-chained.",
    colSpan: "md:col-span-1",
  },
  {
    title: "Rate Limiting",
    description: "Sliding window rate limiter with per-agent tracking. Prevents loops.",
    colSpan: "md:col-span-1",
  },
  {
    title: "Simulation Mode",
    description: "Dry-run everything before it's real. See policy result and spend impact.",
    colSpan: "md:col-span-1",
  },
  {
    title: "Human Approval Webhook",
    description: "Pause. Ask a human. Then proceed. High-value actions can trigger an onApprovalRequired callback with a 30-second timeout.",
    colSpan: "md:col-span-2",
  },
  {
    title: "Schema Drift Detection",
    description: "Pin tool schemas with SHA-256 hashes. ActionFence alerts you when an MCP server silently changes its tool definitions.",
    colSpan: "md:col-span-2",
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="w-full px-6 md:px-12 py-16 flex flex-col gap-16">
      <div className="max-w-4xl">
        <h2 className="text-4xl md:text-5xl font-medium tracking-tighter leading-tight">
          Everything you need to govern AI actions. <span className="text-zinc-600">Nothing you don't.</span>
        </h2>
      </div>

      {/* Wireframe Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 border-l border-t border-zinc-800">
        {features.map((feature, i) => (
          <motion.div
            initial={{ opacity: 0, backgroundColor: "rgba(39,39,42,0)" }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: i * 0.05 }}
            whileHover={{ backgroundColor: "rgba(39,39,42,0.15)" }}
            key={i}
            className={`flex flex-col p-8 border-r border-b border-zinc-800 ${feature.colSpan}`}
          >
            <div className="font-mono text-zinc-600 text-xs mb-8">
              [ F_{String(i + 1).padStart(2, "0")} ]
            </div>
            <div className="mt-auto flex flex-col gap-3">
              <h3 className="text-xl font-medium tracking-tight text-white">
                {feature.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
