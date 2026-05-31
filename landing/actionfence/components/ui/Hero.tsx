"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import LineWaves from "@/components/ui/LineWaves";

const TABS = ["For Human", "For Agent"] as const;

export default function Hero() {
  const setupPrompt = `Install and integrate "actionfence" into my current project.
Read the guide at https://raw.githubusercontent.com/saifeldeen911/actionfence/main/llms-full.txt
then: install the package, create a guard-policy.json, and wire up the middleware.`;

  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabsIdBase = useId().replace(/:/g, "");

  const activeTab = TABS[activeIndex];
  const isHumanTab = activeTab === "For Human";
  const copyText = isHumanTab ? "npm install actionfence" : setupPrompt;
  const panelText = isHumanTab
    ? "Install ActionFence locally in one command."
    : "Send this prompt to your agent to add ActionFence.";

  const getTabId = (index: number) => `${tabsIdBase}-tab-${index}`;
  const getPanelId = (index: number) => `${tabsIdBase}-panel-${index}`;

  const activateTab = (index: number, shouldFocus = false) => {
    const normalized = (index + TABS.length) % TABS.length;
    setActiveIndex(normalized);
    if (shouldFocus) {
      tabRefs.current[normalized]?.focus();
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        activateTab(index + 1, true);
        break;
      case "ArrowLeft":
        event.preventDefault();
        activateTab(index - 1, true);
        break;
      case "Home":
        event.preventDefault();
        activateTab(0, true);
        break;
      case "End":
        event.preventDefault();
        activateTab(TABS.length - 1, true);
        break;
      default:
        break;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
    } catch {
      // Clipboard access can be restricted in browser automation contexts.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="relative min-h-dvh w-full flex flex-col justify-end px-6 md:px-12 pb-24 pt-32 overflow-hidden">
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

        {/* Right CTA card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="col-span-1 lg:col-span-4 flex flex-col gap-8 pointer-events-auto"
        >
          <p className="text-lg text-zinc-400 leading-relaxed max-w-md">
            ActionFence is an AI action firewall that sits in front of your MCP servers and APIs. One JSON policy. Spend caps. Signed receipts. Zero trust by default.
          </p>

          <div className="border border-zinc-800 bg-[#09090b]">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-800 scrollbar-hide">
              <div role="tablist" aria-label="Install options" className="flex flex-1 overflow-x-auto">
              {TABS.map((tab, index) => (
                <button
                  key={tab}
                  id={getTabId(index)}
                  role="tab"
                  aria-selected={activeIndex === index}
                  aria-controls={getPanelId(index)}
                  tabIndex={activeIndex === index ? 0 : -1}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  onClick={() => {
                    activateTab(index);
                    setCopied(false);
                  }}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className="relative px-6 py-4 font-mono text-sm tracking-wide transition-colors whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
                  style={{
                    color: activeTab === tab ? "#7c83ff" : "#52525b",
                  }}
                >
                    {activeTab === tab && (
                      <motion.div
                        layoutId="hero-active-tab"
                        className="absolute inset-0 bg-accent/8"
                        initial={false}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      />
                    )}
                    <span className="relative z-10">{tab}</span>
                    <div className="absolute right-0 top-0 bottom-0 w-px bg-accent/15" />
                </button>
              ))}
              </div>

              <Link
                href="/docs/readme"
                className="shrink-0 px-4 md:px-6 font-mono text-xs uppercase tracking-[0.2em] text-accent/80 transition-colors hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
              >
                README
              </Link>
            </div>

            <div
              id={getPanelId(activeIndex)}
              role="tabpanel"
              aria-labelledby={getTabId(activeIndex)}
              tabIndex={0}
              className="p-5 md:p-6 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-5 font-mono"
                >
                  <p className="max-w-xl text-sm leading-relaxed text-zinc-400 md:text-base font-sans">
                    {panelText}
                  </p>

                  <div className="flex items-center justify-between gap-4 border border-zinc-800 bg-zinc-950 px-4 py-4 md:px-5">
                    <code className="min-w-0 flex-1 truncate font-mono text-sm text-zinc-100 md:text-base">
                      {isHumanTab ? "npm install actionfence" : "copy setup instructions for my agent"}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="shrink-0 font-mono text-xs tracking-[0.22em] text-accent/80 transition-colors hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
                    >
                      {copied ? "[copied]" : "[copy]"}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
