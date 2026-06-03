import Link from "next/link";
import SectionShell from "./SectionShell";

export default function Footer() {
  return (
    <footer className="w-full flex flex-col border-t border-zinc-800 bg-[#09090b]">
      <section className="w-full border-b border-zinc-800 py-20 md:py-24">
        <SectionShell className="flex flex-col items-start gap-8 md:gap-10">
          <div className="max-w-2xl space-y-4">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
              Install surface
            </p>
            <h2 className="text-3xl md:text-5xl font-medium tracking-tighter leading-tight">
            Install ActionFence in under 60 seconds.
            </h2>
            <p className="max-w-xl text-sm md:text-base leading-7 text-zinc-400">
              One install command, then wire the middleware into the place your agents already pass through.
            </p>
          </div>

          <div className="w-full max-w-xl border border-zinc-800 bg-zinc-950 px-5 py-4 font-mono text-sm md:text-base text-zinc-100">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-subtle">$</span>
              <span>npm install actionfence</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-subtle">$</span>
              <span className="text-zinc-300">npx actionfence init</span>
            </div>
          </div>
        </SectionShell>
      </section>

      <section className="w-full border-t border-zinc-800 py-14 bg-[#09090b]">
        <SectionShell>
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-3 font-mono text-sm">
            <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
              <span className="text-white">ActionFence</span>
              <p className="max-w-xs text-subtle leading-relaxed">
                AI Action Firewall.
              </p>
              <p className="text-xs uppercase tracking-[0.22em] text-subtle">
                MIT License
              </p>
              <p className="text-subtle">
                © 2026 Saifeldeen
              </p>
            </div>
            <div className="flex flex-col gap-4 text-subtle">
              <span className="text-accent uppercase tracking-widest text-xs mb-2">Resources</span>
              <Link href="/docs/readme" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Documentation</Link>
              <Link href="/docs/readme#api-reference" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">API Reference</Link>
              <Link href="/docs/changelog" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Changelog</Link>
              <Link href="/docs/security" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Security Policy</Link>
            </div>
            <div className="flex flex-col gap-4 text-subtle">
              <span className="text-accent uppercase tracking-widest text-xs mb-2">Community</span>
              <a href="https://github.com/saifeldeen911/actionfence" target="_blank" rel="noopener noreferrer" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">GitHub</a>
              <a href="https://github.com/saifeldeen911/actionfence/issues" target="_blank" rel="noopener noreferrer" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Issues</a>
              <Link href="/docs/contributing" className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent/60">Contributing</Link>
            </div>
          </div>
        </SectionShell>
      </section>
    </footer>
  );
}
