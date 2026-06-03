"use client";

import { usePathname } from "next/navigation";
import FaultyTerminal from "@/components/ui/FaultyTerminal";
import { getRepoDocMetaByRoute } from "@/lib/docs-meta";

const docsGridMul: [number, number] = [2, 1];

export default function DocsHero() {
  const pathname = usePathname();
  const doc = getRepoDocMetaByRoute(pathname);

  return (
    <section className="relative overflow-hidden border-b border-zinc-800 px-6 py-16 md:px-12 md:py-24">
      <div className="pointer-events-none absolute inset-0 opacity-[0.85]">
        <FaultyTerminal
          className="h-full w-full"
          scale={1.5}
          gridMul={docsGridMul}
          digitSize={1.25}
          timeScale={0.8}
          scanlineIntensity={0.9}
          glitchAmount={1.1}
          flickerAmount={1}
          noiseAmp={0.85}
          chromaticAberration={0}
          dither={0.25}
          curvature={0.1}
          tint="#7c83ff"
          mouseReact={false}
          mouseStrength={1.1}
          pageLoadAnimation={false}
          brightness={0.95}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-[#09090b]/35 via-[#09090b]/58 to-[#09090b]/88" />

      <div className="relative z-10 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="mb-8 font-mono text-xs uppercase tracking-widest text-zinc-400">{doc.fileName}</div>
          <h1 className="text-5xl font-medium leading-[0.95] tracking-tighter md:text-7xl">{doc.title}</h1>
        </div>
        <p className="max-w-md text-lg leading-relaxed text-zinc-300 lg:col-span-4 lg:self-end">
          {doc.description}
        </p>
      </div>
    </section>
  );
}
