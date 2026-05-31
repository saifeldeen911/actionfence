/* eslint-disable react/no-unescaped-entities */
"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TABS = ["MCP Server", "Express / Fastify", "CLI"] as const;
type TabKey = (typeof TABS)[number];

const CODE_BLOCKS: Record<TabKey, React.ReactNode> = {
  "MCP Server": (
    <pre className="text-zinc-300 text-sm md:text-base leading-loose overflow-x-auto">
      <code>
        <span className="text-zinc-500">import</span> {"{"} <span className="text-zinc-100">McpServer</span> {"}"} <span className="text-zinc-500">from</span> <span className="text-amber-200/80">'@modelcontextprotocol/sdk/server/mcp.js'</span>;{"\n"}
        <span className="text-zinc-500">import</span> {"{"} <span className="text-zinc-100">withGuard</span> {"}"} <span className="text-zinc-500">from</span> <span className="text-amber-200/80">'actionfence'</span>;{"\n\n"}
        
        <span className="text-zinc-500">const</span> server = <span className="text-zinc-500">new</span> <span className="text-zinc-100">McpServer</span>({"{"} name: <span className="text-amber-200/80">'my-server'</span>, version: <span className="text-amber-200/80">'1.0.0'</span> {"}"});{"\n\n"}
        
        <span className="text-zinc-600">{"// One line. That's the entire integration."}</span>{"\n"}
        <span className="text-zinc-100">withGuard</span>(server, {"{"}{"\n"}
        {"  "}policy: <span className="text-amber-200/80">'./guard-policy.json'</span>,{"\n"}
        {"  "}identityReaderOptions: {"{"}{"\n"}
        {"    "}jwksUri: <span className="text-amber-200/80">'https://issuer.example/.well-known/jwks.json'</span>,{"\n"}
        {"    "}issuer: <span className="text-amber-200/80">'https://issuer.example'</span>,{"\n"}
        {"    "}audience: <span className="text-amber-200/80">'bookflight-mcp'</span>,{"\n"}
        {"  "}{"}"},{"\n"}
        {"}"});{"\n\n"}
        
        <span className="text-zinc-600">{"// Register tools as normal — ActionFence wraps them automatically"}</span>{"\n"}
        server.<span className="text-zinc-100">registerTool</span>(<span className="text-amber-200/80">'book_flight'</span>, {"{}"}, <span className="text-zinc-500">async</span> () {"=>"} {"{"}{"\n"}
        {"  "}<span className="text-zinc-500">return</span> {"{"} content: [{"{"} type: <span className="text-amber-200/80">'text'</span>, text: <span className="text-amber-200/80">'Booked!'</span> {"}"}] {"}"};{"\n"}
        {"}"});
      </code>
    </pre>
  ),
  "Express / Fastify": (
    <pre className="text-zinc-300 text-sm md:text-base leading-loose overflow-x-auto">
      <code>
        <span className="text-zinc-500">import</span> express <span className="text-zinc-500">from</span> <span className="text-amber-200/80">'express'</span>;{"\n"}
        <span className="text-zinc-500">import</span> {"{"} <span className="text-zinc-100">guard</span> {"}"} <span className="text-zinc-500">from</span> <span className="text-amber-200/80">'actionfence'</span>;{"\n\n"}

        <span className="text-zinc-500">const</span> app = <span className="text-zinc-100">express</span>();{"\n"}
        app.<span className="text-zinc-100">use</span>(express.<span className="text-zinc-100">json</span>());{"\n\n"}

        <span className="text-zinc-600">{"// Drop-in middleware — works with Express, Fastify, or any connect-compatible framework"}</span>{"\n"}
        app.<span className="text-zinc-100">use</span>({"\n"}
        {"  "}<span className="text-zinc-100">guard</span>({"{"}{"\n"}
        {"    "}policy: <span className="text-amber-200/80">'./guard-policy.json'</span>,{"\n"}
        {"    "}spendExtractor: <span className="text-zinc-500">(</span>params<span className="text-zinc-500">) =&gt;</span> params?.body?.amount ?? <span className="text-zinc-500">null</span>,{"\n"}
        {"  "}{"}"}){"\n"}
        );{"\n\n"}

        app.<span className="text-zinc-100">post</span>(<span className="text-amber-200/80">'/bookings'</span>, <span className="text-zinc-500">(</span>req, res<span className="text-zinc-500">) =&gt;</span> {"{"}{"\n"}
        {"  "}res.<span className="text-zinc-100">json</span>({"{"} status: <span className="text-amber-200/80">'booked'</span> {"}"}); <span className="text-zinc-600">{"// Only runs if ActionFence allows it"}</span>{"\n"}
        {"}"});
      </code>
    </pre>
  ),
  "CLI": (
    <pre className="text-zinc-300 text-sm md:text-base leading-loose overflow-x-auto">
      <code>
        <span className="text-zinc-600">{"# Scaffold a policy"}</span>{"\n"}
        <span className="text-zinc-100">npx actionfence init</span>{"\n\n"}

        <span className="text-zinc-600">{"# Validate your policy"}</span>{"\n"}
        <span className="text-zinc-100">npx actionfence validate guard-policy.json</span>{"\n\n"}

        <span className="text-zinc-600">{"# Dry-run a decision"}</span>{"\n"}
        <span className="text-zinc-100">npx actionfence simulate guard-policy.json \</span>{"\n"}
        {"  "}<span className="text-zinc-400">--action book_flight \</span>{"\n"}
        {"  "}<span className="text-zinc-400">--identity verified \</span>{"\n"}
        {"  "}<span className="text-zinc-400">--spend 250</span>{"\n\n"}

        <span className="text-zinc-600">{"# Pin tool schemas to detect drift"}</span>{"\n"}
        <span className="text-zinc-100">npx actionfence pin-schemas guard-policy.json <span className="text-amber-200/80">&quot;node server.js&quot;</span></span>
      </code>
    </pre>
  )
};

export default function CodeExamples() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = TABS[activeIndex];
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabsIdBase = useId().replace(/:/g, "");

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

  return (
    <section id="examples" className="w-full px-6 md:px-12 py-32 border-t border-zinc-800">
      <div className="flex flex-col gap-12">
        <h2 className="text-4xl md:text-5xl font-medium tracking-tighter leading-tight max-w-3xl">
          60 seconds to integrate. <span className="text-accent/75">We mean it.</span>
        </h2>

        {/* Brutalist Code Terminal */}
        <div className="w-full border border-zinc-800 bg-[#09090b] flex flex-col">
          {/* Header Tabs */}
          <div role="tablist" aria-label="Integration examples" className="flex overflow-x-auto border-b border-zinc-800 scrollbar-hide">
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
                onClick={() => activateTab(index)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className="relative px-6 py-4 font-mono text-sm tracking-wide transition-colors whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
                style={{
                  color: activeTab === tab ? "#7c83ff" : "#52525b"
                }}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute inset-0 bg-accent/8"
                    initial={false}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
                {/* Right border separator */}
                <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-accent/15" />
              </button>
            ))}
          </div>

          {/* Body */}
          <div
            id={getPanelId(activeIndex)}
            role="tabpanel"
            aria-labelledby={getTabId(activeIndex)}
            tabIndex={0}
            className="p-6 md:p-12 min-h-[400px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="font-mono"
              >
                {CODE_BLOCKS[activeTab]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
