"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useClipboardCopy } from "./useClipboardCopy";

const TABS = ["For Human", "For Agent"] as const;

export default function HeroInstallTabs() {
  const setupPrompt = `Install and integrate "actionfence" into my current project.
Read the guide at https://raw.githubusercontent.com/saifeldeen911/actionfence/main/llms-full.txt
then: install the package, create a guard-policy.json, and wire up the middleware.`;
  const installCommand = "npm install actionfence";

  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabsIdBase = useId().replace(/:/g, "");
  const { status: copyStatus, copy, reset: resetCopyStatus } = useClipboardCopy(1500);

  const activeTab = TABS[activeIndex];
  const isHumanTab = activeTab === "For Human";
  const copyText = isHumanTab ? installCommand : setupPrompt;
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
    await copy(copyText);
  };

  return (
    <div className="border border-zinc-800 bg-[#09090b]">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800 scrollbar-hide">
        <div
          role="tablist"
          aria-label="Install options"
          className="flex flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
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
                resetCopyStatus();
              }}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={`relative px-6 py-4 font-mono text-sm tracking-wide transition-colors whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-accent/60 ${
                activeTab === tab ? "bg-accent/8 text-accent" : "text-subtle"
              }`}
            >
              <span className="relative z-10">{tab}</span>
              <div className="absolute right-0 top-0 bottom-0 w-px bg-accent/15" />
            </button>
          ))}
        </div>

        <Link
          href="/docs/readme"
          className="shrink-0 px-4 md:px-6 font-mono text-xs uppercase tracking-[0.2em] text-accent transition-colors hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
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
        <div className="flex flex-col gap-5 font-mono">
          <p className="max-w-xl text-sm leading-relaxed text-zinc-400 md:text-base font-sans">
            {panelText}
          </p>

          <div className="flex items-center justify-between gap-4 border border-zinc-800 bg-zinc-950 px-4 py-4 md:px-5">
            <code className="min-w-0 flex-1 truncate font-mono text-sm text-zinc-100 md:text-base">
              {isHumanTab ? installCommand : "copy setup instructions for my agent"}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 font-mono text-xs tracking-[0.22em] text-accent transition-colors hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
            >
              {copyStatus === "success"
                ? "[copied]"
                : copyStatus === "error"
                  ? "[manual copy]"
                  : "[copy]"}
            </button>
          </div>

          {copyStatus === "error" ? (
            <div
              aria-live="polite"
              className="border border-zinc-800 bg-[#111319] p-4 text-xs leading-relaxed text-zinc-300"
            >
              <p>Clipboard access is blocked. Select and copy manually:</p>
              {isHumanTab ? (
                <code className="mt-3 block select-all break-all font-mono text-zinc-100">
                  {installCommand}
                </code>
              ) : (
                <textarea
                  readOnly
                  id="hero-agent-setup-prompt"
                  name="hero-agent-setup-prompt"
                  value={setupPrompt}
                  rows={6}
                  className="mt-3 w-full resize-y border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-100 outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
                  aria-label="Agent setup prompt for manual copy"
                />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
