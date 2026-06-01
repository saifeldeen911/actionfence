"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import SectionShell from "./SectionShell";

type SiteHeaderProps = {
  variant?: "landing" | "docs";
};

const navLinks = [
  { label: "Features", href: "/#features", internal: true },
  { label: "Docs", href: "/docs/readme", internal: true, activePrefix: "/docs" },
  { label: "Examples", href: "/#examples", internal: true },
  { label: "GitHub", href: "https://github.com/saifeldeen911/actionfence", internal: false },
];

export default function SiteHeader({ variant = "landing" }: SiteHeaderProps) {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText("npm install actionfence");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLanding = variant === "landing";

  return (
    <header
      className={[
        "left-0 right-0 z-50 text-white",
        isLanding
          ? "fixed top-0 mix-blend-difference"
          : "sticky top-0 border-b border-zinc-800 bg-[#09090b] text-zinc-50",
      ].join(" ")}
    >
      <SectionShell className="flex flex-wrap items-center justify-between gap-y-4 py-6 md:flex-nowrap">
        <div className="flex w-full items-center justify-between md:w-auto">
          <Link href="/" className="text-xl font-medium tracking-tight transition-opacity hover:opacity-60">
            ActionFence
          </Link>
          <button
            onClick={handleCopy}
            className="text-sm font-mono transition-opacity hover:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-accent/60 md:hidden"
          >
            {copied ? "[ COPIED ]" : "[ npm install ]"}
          </button>
        </div>

        <nav className="scrollbar-none flex w-full items-center gap-6 overflow-x-auto pb-1 text-sm font-medium md:w-auto md:gap-12 md:pb-0">
          {navLinks.map((link) => {
            const active = link.internal && link.activePrefix ? pathname.startsWith(link.activePrefix) : false;
            const className = [
              "whitespace-nowrap transition-opacity hover:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-accent/60",
              active ? "font-mono text-zinc-50" : "",
            ].join(" ");

            return link.internal ? (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={className}
              >
                {active ? `[ ${link.label} ]` : link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap transition-opacity hover:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <button
          onClick={handleCopy}
          className="hidden text-sm font-mono transition-opacity hover:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-accent/60 md:block"
        >
          {copied ? "[ COPIED ]" : "[ npm install ]"}
        </button>
      </SectionShell>
    </header>
  );
}
