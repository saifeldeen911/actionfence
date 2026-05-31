"use client";

import { motion } from "framer-motion";
import LineWaves from "@/components/ui/LineWaves";

export default function Hero() {
  return (
    <section className="relative min-h-[100dvh] w-full flex flex-col justify-end px-6 md:px-12 pb-24 pt-32 overflow-hidden">
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-40">
        <LineWaves 
          speed={0.15}
          innerLineCount={36}
          outerLineCount={40}
          warpIntensity={0.8}
          rotation={-30}
          edgeFadeWidth={0.12}
          colorCycleSpeed={0.3}
          brightness={0.4}
          color1="#7c83ff" // accent rim light
          color2="#3f3f46" // zinc-700 accents
          color3="#27272a" // zinc-800 dark bounds
          enableMouseInteraction={true}
          mouseInfluence={2.0}
        />
      </div>
      
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12 items-end pointer-events-none">
        
        {/* Left massive typography */}
        <div className="col-span-1 lg:col-span-8 flex flex-col gap-8 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm font-mono tracking-wider uppercase text-accent/80"
          >
            Open-source middleware for Node.js
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-[7rem] font-medium tracking-tighter leading-[0.95]"
          >
            Your AI agents are spending money.<br/>
            <span className="text-accent/75">Who&apos;s watching?</span>
          </motion.h1>
        </div>

        {/* Right strict code block */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="col-span-1 lg:col-span-4 flex flex-col gap-8 pointer-events-auto"
        >
          <p className="text-lg text-zinc-400 leading-relaxed max-w-md">
            ActionFence is an AI action firewall that sits in front of your MCP servers and APIs. One JSON policy. Spend caps. Signed receipts. Zero trust by default.
          </p>

          <div className="p-8 bg-zinc-900/50 border border-accent/20 text-sm font-mono text-zinc-300">
            <pre>
<code>{`import { withGuard } from 'actionfence';

withGuard(server, {
  policy: './guard-policy.json',
});

// Guarded.`}</code>
            </pre>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
