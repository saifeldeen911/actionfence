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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText("npm install actionfence");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLanding = variant === "landing";

  const headerClassName = [
    "left-0 right-0 z-50",
    isLanding
      ? [
          "fixed top-0 text-zinc-50 md:text-white md:mix-blend-difference",
          "border-b border-zinc-900/80 bg-[rgba(9,9,11,0.72)] backdrop-blur-xl md:border-0 md:bg-transparent md:backdrop-blur-none",
        ].join(" ")
      : "sticky top-0 border-b border-zinc-800 bg-[#09090b] text-zinc-50",
  ].join(" ");

  const navLinkClassName =
    "whitespace-nowrap transition-opacity hover:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-accent/60";

  return (
    <header className={headerClassName}>
      <SectionShell className="py-4 md:py-6">
        <div className="flex items-center justify-between gap-6">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="text-xl font-medium tracking-tight transition-opacity hover:opacity-60"
          >
            ActionFence
          </Link>

          <nav className="hidden items-center gap-12 text-sm font-medium md:flex">
            {navLinks.map((link) => {
              const active = link.internal && link.activePrefix ? pathname.startsWith(link.activePrefix) : false;
              const className = [navLinkClassName, active ? "font-mono text-zinc-50" : ""].join(" ");

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
                  className={navLinkClassName}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="site-mobile-menu"
              className="inline-flex items-center gap-2 text-sm font-mono transition-opacity hover:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-accent/60 md:hidden"
            >
              <span>[</span>
              <span
                aria-hidden="true"
                className={[
                  "inline-block min-w-[0.75rem] text-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  mobileMenuOpen ? "rotate-45" : "rotate-0",
                ].join(" ")}
              >
                +
              </span>
              <span>]</span>
            </button>

            <button
              onClick={handleCopy}
              className="hidden text-sm font-mono transition-opacity hover:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-accent/60 md:block"
            >
              {copied ? "[ COPIED ]" : "[ npm install ]"}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div
            id="site-mobile-menu"
            className="mt-4 border border-zinc-800/80 bg-[#0b0c11]/95 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur md:hidden"
          >
            <nav className="flex flex-col border border-zinc-800/80 bg-[#09090b]">
              {navLinks.map((link, index) => {
                const active = link.internal && link.activePrefix ? pathname.startsWith(link.activePrefix) : false;
                const linkLabel = active ? `[ ${link.label} ]` : link.label;

                return link.internal ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 text-sm font-medium text-zinc-100 transition-colors hover:bg-accent/8 hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
                  >
                    <span>{linkLabel}</span>
                    <span className="font-mono text-[11px] tracking-[0.24em] text-zinc-500">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-100 transition-colors hover:bg-accent/8 hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
                  >
                    <span>{link.label}</span>
                    <span className="font-mono text-[11px] tracking-[0.24em] text-zinc-500">EXT</span>
                  </a>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleCopy}
              className="mt-3 flex w-full items-center justify-between border border-zinc-800/80 bg-[#111319] px-4 py-4 text-left transition-colors hover:border-accent/35 hover:bg-accent/8 outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
            >
              <span className="font-mono text-sm text-zinc-100">{copied ? "npm install copied" : "npm install actionfence"}</span>
              <span className="font-mono text-[11px] tracking-[0.24em] text-accent/85">
                {copied ? "DONE" : "COPY"}
              </span>
            </button>
          </div>
        ) : null}
      </SectionShell>
    </header>
  );
}
