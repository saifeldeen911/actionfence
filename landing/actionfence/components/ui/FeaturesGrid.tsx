"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const features = [
  {
    title: "JSON Policy Engine",
    description: "Declarative rules in guard-policy.json. Allow, deny, require identity, set spend caps — all in one file. Supports wildcard matching (book_*) and hot-reload on change.",
    colSpan: "md:col-span-2",
    asset: "/feature-assets/json-policy.png",
    alt: "Glossy 3D code braces",
    assetClassName: "w-[58%] max-w-56 md:w-[42%]",
  },
  {
    title: "Multi-Layer Spend Caps",
    description: "Per-action, Session, Daily, Rolling Window, and Global Circuit Breaker. Stop death-by-a-thousand-cuts. A 60-minute rolling window catches fragmented micro-spending that per-call limits miss.",
    colSpan: "md:col-span-2",
    asset: "/feature-assets/spend-caps.png",
    alt: "Glossy 3D dollar sign with shield",
    assetClassName: "w-[60%] max-w-58 md:w-[44%]",
  },
  {
    title: "Identity & JWT Verification",
    description: "Three tiers: anonymous → token → verified. Built-in JWKS verification.",
    colSpan: "md:col-span-1",
    asset: "/feature-assets/identity-badge.png",
    alt: "Glossy 3D ID badge",
    assetClassName: "w-[58%] max-w-48 md:w-[70%]",
  },
  {
    title: "Signed Receipt Chain",
    description: "Cryptographic proof of every decision. HMAC-SHA256 signed. Hash-chained.",
    colSpan: "md:col-span-1",
    asset: "/feature-assets/receipt-chain.png",
    alt: "Glossy 3D chain with receipt tag",
    assetClassName: "w-[62%] max-w-50 md:w-[74%]",
  },
  {
    title: "Rate Limiting",
    description: "Sliding window rate limiter with per-agent tracking. Prevents loops.",
    colSpan: "md:col-span-1",
    asset: "/feature-assets/rate-limiting.png",
    alt: "Glossy 3D stopwatch",
    assetClassName: "w-[62%] max-w-50 md:w-[74%]",
  },
  {
    title: "Simulation Mode",
    description: "Dry-run everything before it's real. See policy result and spend impact.",
    colSpan: "md:col-span-1",
    asset: "/feature-assets/simulation-flask.png",
    alt: "Glossy 3D lab flask",
    assetClassName: "w-[58%] max-w-48 md:w-[70%]",
  },
  {
    title: "Human Approval Webhook",
    description: "Pause. Ask a human. Then proceed. High-value actions can trigger an onApprovalRequired callback with a 30-second timeout.",
    colSpan: "md:col-span-2",
    asset: "/feature-assets/human-approval.png",
    alt: "Glossy 3D raised hand",
    assetClassName: "w-[58%] max-w-56 md:w-[42%]",
  },
  {
    title: "Schema Drift Detection",
    description: "Pin tool schemas with SHA-256 hashes. ActionFence alerts you when an MCP server silently changes its tool definitions.",
    colSpan: "md:col-span-2",
    asset: "/feature-assets/schema-drift.png",
    alt: "Glossy 3D magnifying glass inspecting a schema",
    assetClassName: "w-[64%] max-w-60 md:w-[46%]",
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="w-full px-6 md:px-12 py-16 flex flex-col gap-16">
      <div className="max-w-4xl">
        <h2 className="text-4xl md:text-5xl font-medium tracking-tighter leading-tight">
          Everything you need to govern AI actions. <span className="text-accent/75">Nothing you don&apos;t.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 border-l border-t border-zinc-800">
        {features.map((feature, i) => (
          <motion.div
            initial={{ opacity: 0, backgroundColor: "rgba(39,39,42,0)" }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: i * 0.05 }}
            whileHover={{ backgroundColor: "rgba(39,39,42,0.15)" }}
            key={feature.title}
            className={`group flex min-h-92 flex-col overflow-hidden border-r border-b border-zinc-800 ${feature.colSpan}`}
          >
            <div className="relative flex min-h-48 items-center justify-center overflow-hidden bg-[#09090b] p-6">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(63,63,70,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(63,63,70,0.2)_1px,transparent_1px)] bg-size-[2rem_2rem] opacity-30" />
              <div className="absolute inset-x-8 top-1/2 h-20 -translate-y-1/2 bg-accent/12 blur-3xl transition-opacity duration-500 group-hover:opacity-90" />
              <Image
                src={feature.asset}
                alt={feature.alt}
                width={1254}
                height={1254}
                sizes={feature.colSpan === "md:col-span-2" ? "(min-width: 768px) 22vw, 70vw" : "(min-width: 768px) 18vw, 70vw"}
                className={`relative z-10 h-auto object-contain drop-shadow-[0_24px_42px_rgba(0,0,0,0.44)] transition duration-500 ease-out group-hover:scale-[1.04] ${feature.assetClassName}`}
              />
            </div>
            <div className="mt-auto flex flex-col gap-3 p-8">
              <h3 className="text-xl font-medium tracking-tight text-white group-hover:text-accent transition-colors duration-300">
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
