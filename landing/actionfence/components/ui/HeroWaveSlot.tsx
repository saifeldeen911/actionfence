"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const DynamicLineWaves = dynamic(() => import("@/components/ui/LineWaves"), {
  ssr: false,
  loading: () => <LineWavesFallback />,
});

function LineWavesFallback() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(125deg,transparent_0%,rgba(124,131,255,0.28)_28%,rgba(63,63,70,0.18)_46%,transparent_68%),repeating-linear-gradient(125deg,rgba(124,131,255,0.16)_0_1px,transparent_1px_9px)] opacity-80 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,#000_42%,transparent_78%)]"
      />
    </div>
  );
}

export default function HeroWaveSlot() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isCompactViewport = window.matchMedia("(max-width: 767px)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

    if (prefersReducedMotion || isCompactViewport || saveData) {
      return;
    }

    const timeoutId = window.setTimeout(() => setShouldLoad(true), 900);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!shouldLoad) {
    return <LineWavesFallback />;
  }

  return (
    <DynamicLineWaves
      speed={0.15}
      innerLineCount={36}
      outerLineCount={40}
      warpIntensity={0.8}
      rotation={-30}
      edgeFadeWidth={0.12}
      colorCycleSpeed={0.3}
      brightness={0.4}
      color1="#7c83ff"
      color2="#3f3f46"
      color3="#27272a"
      enableMouseInteraction
      mouseInfluence={2.0}
    />
  );
}
