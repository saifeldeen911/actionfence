import HeroInstallTabs from "@/components/ui/HeroInstallTabs";
import HeroWaveSlot from "@/components/ui/HeroWaveSlot";

export default function Hero() {
  return (
    <section className="relative min-h-dvh w-full overflow-hidden">
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-40">
        <HeroWaveSlot />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col justify-start px-6 pb-16 pt-24 md:justify-end md:px-12 md:pb-24 md:pt-32 lg:px-16">
        <div className="grid grid-cols-1 items-end gap-10 pointer-events-none md:gap-16 lg:grid-cols-12 lg:gap-12">
          <div className="col-span-1 flex flex-col gap-5 pointer-events-auto md:gap-8 lg:col-span-8">
            <div className="text-xs font-mono tracking-[0.26em] uppercase text-accent md:text-sm">
              Open-source middleware for Node.js
            </div>

            <h1 className="max-w-[10.5ch] text-[3.35rem] font-medium tracking-tighter leading-[0.9] text-balance md:max-w-none md:text-7xl md:leading-[0.95] lg:text-[7rem]">
              Your AI agents are spending money.<br />
              <span className="text-accent">Who&apos;s watching?</span>
            </h1>
          </div>

          <div className="col-span-1 flex max-w-xl flex-col gap-6 pointer-events-auto md:gap-8 lg:col-span-4 lg:max-w-none">
            <p className="max-w-md text-[0.95rem] leading-7 text-zinc-300 md:text-lg md:leading-relaxed md:text-zinc-400">
              ActionFence is an AI action firewall that sits in front of your MCP servers and APIs. One JSON policy.
              Spend caps. Signed receipts. Zero trust by default.
            </p>

            <HeroInstallTabs />
          </div>
        </div>
      </div>
    </section>
  );
}
