"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import SectionShell from "./SectionShell";
import { baseClassByLayout, getAssetScaleStyle, type ThreeDAssetKey } from "./threeDAssetSizing";

const steps = [
  {
    title: "Define your policy",
    description: "Write the allowlist, spend limits, identity tier, and rate windows in guard-policy.json.",
    asset: {
      src: "/how-it-works-assets/tablet-json.png",
      key: "tablet-json",
      alt: "3D tablet displaying JSON policy code",
      width: 1254,
      height: 1254,
    },
  },
  {
    title: "Wrap your server",
    description: "withGuard() and guard() intercept tool calls before handlers run, then evaluate policy on your server.",
    asset: {
      src: "/how-it-works-assets/shield-tilted.png",
      key: "shield-tilted",
      alt: "Tilted glossy 3D shield",
      width: 1254,
      height: 1254,
    },
  },
  {
    title: "Every decision is receipted",
    description: "Store hash-chained, HMAC-signed receipts in SQLite or PostgreSQL for every allow and block.",
    asset: {
      src: "/how-it-works-assets/chain-links.png",
      key: "chain-links",
      alt: "Two glossy 3D chain links",
      width: 1254,
      height: 1254,
    },
  },
] as const satisfies ReadonlyArray<{
  title: string;
  description: string;
  asset: {
    src: string;
    key: ThreeDAssetKey;
    alt: string;
    width: number;
    height: number;
  };
}>;

export default function HowItWorks() {
  return (
    <section className="w-full py-32 border-t border-zinc-800">
      <SectionShell className="flex flex-col gap-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="font-mono text-xs uppercase tracking-widest text-accent/75">
              Integration path
            </div>
            <h2 className="mt-8 max-w-4xl text-4xl font-medium tracking-tighter leading-[0.95] md:text-6xl">
              One line of code.
              <br />
              <span className="text-accent/75">Three layers of defense.</span>
            </h2>
          </div>
          <div className="flex items-end lg:col-span-5 lg:justify-end">
            <p className="max-w-md text-base leading-relaxed text-zinc-500 md:text-lg">
              ActionFence turns a normal tool call into a governed decision with proof attached.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 border-l border-t border-zinc-800 lg:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              key={step.title}
              className="group flex min-h-136 flex-col overflow-hidden border-r border-b border-zinc-800 transition-colors duration-500 hover:bg-zinc-900/25"
            >
              <div className="relative flex min-h-72 items-center justify-center overflow-hidden bg-[#09090b] p-8 md:min-h-80 lg:min-h-76">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(63,63,70,0.24)_1px,transparent_1px),linear-gradient(to_bottom,rgba(63,63,70,0.24)_1px,transparent_1px)] bg-size-[2.4rem_2.4rem] opacity-35" />
                <div className="absolute inset-x-10 top-1/2 h-28 -translate-y-1/2 bg-accent/12 blur-3xl transition-opacity duration-500 group-hover:opacity-90" />
                <Image
                  src={step.asset.src}
                  alt={step.asset.alt}
                  width={step.asset.width}
                  height={step.asset.height}
                  sizes="(min-width: 1024px) 28vw, (min-width: 768px) 48vw, 86vw"
                  style={getAssetScaleStyle(step.asset.key, 1.035)}
                  className={`relative z-10 h-auto origin-center object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.48)] transition duration-500 ease-out will-change-transform [transform:scale(var(--asset-scale))] group-hover:[transform:scale(var(--asset-hover-scale))] ${baseClassByLayout.howItWorks}`}
                  priority={i === 0}
                />
              </div>

              <div className="flex flex-1 flex-col justify-end gap-5 p-6 md:p-8 lg:p-9">
                <h3 className="text-2xl font-medium tracking-tight text-zinc-50 transition-colors duration-300 group-hover:text-accent md:text-3xl lg:text-2xl xl:text-3xl">
                  {step.title}
                </h3>
                <p className="text-base leading-relaxed text-zinc-500">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </SectionShell>
    </section>
  );
}
