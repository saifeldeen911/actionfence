import Image from "next/image";
import SectionShell from "./SectionShell";
import { baseClassByLayout, getAssetScaleStyle, type ThreeDAssetKey } from "./threeDAssetSizing";

const featureGroups = [
  {
    id: "policy-setup",
    sequence: "01",
    title: "Policy Setup",
    helper: "Define guardrails before any tool call can execute.",
    features: [
      {
        title: "JSON Policy Engine",
        description: "Declarative rules in guard-policy.json for allow, deny, identity, and spend caps. Supports wildcard matching (book_*) and hot-reload.",
        colSpan: "md:col-span-2",
        layout: "featureWide",
        asset: "/feature-assets/json-policy.png",
        assetKey: "json-policy",
        alt: "Glossy 3D code braces",
        variant: "primary",
      },
      {
        title: "Identity & JWT Verification",
        description: "Three tiers: anonymous → token → verified, with built-in JWKS verification.",
        colSpan: "md:col-span-2",
        layout: "featureWide",
        asset: "/feature-assets/identity-badge.png",
        assetKey: "identity-badge",
        alt: "Glossy 3D ID badge",
        variant: "standard",
      },
    ],
  },
  {
    id: "runtime-enforcement",
    sequence: "02",
    title: "Runtime Enforcement",
    helper: "Enforce spend, pace, and approvals while requests are live.",
    features: [
      {
        title: "Multi-Layer Spend Caps",
        description: "Per-action, session, daily, rolling window, and global circuit-breaker caps catch fragmented micro-spending that per-call limits miss.",
        colSpan: "md:col-span-2",
        layout: "featureWide",
        asset: "/feature-assets/spend-caps.png",
        assetKey: "spend-caps",
        alt: "Glossy 3D dollar sign with shield",
        variant: "primary",
      },
      {
        title: "Rate Limiting",
        description: "Sliding-window rate limiting with per-agent tracking to stop runaway loops.",
        colSpan: "md:col-span-1",
        layout: "featureNarrow",
        asset: "/feature-assets/rate-limiting.png",
        assetKey: "rate-limiting",
        alt: "Glossy 3D stopwatch",
        variant: "standard",
      },
      {
        title: "Human Approval Webhook",
        description: "Pause high-value actions for human approval via onApprovalRequired with a 30-second timeout.",
        colSpan: "md:col-span-1",
        layout: "featureNarrow",
        asset: "/feature-assets/human-approval.png",
        assetKey: "human-approval",
        alt: "Glossy 3D raised hand",
        variant: "standard",
      },
    ],
  },
  {
    id: "oversight-and-recovery",
    sequence: "03",
    title: "Oversight & Recovery",
    helper: "Keep a verifiable trail and catch silent control-plane drift.",
    features: [
      {
        title: "Signed Receipt Chain",
        description: "Cryptographic proof of every decision with HMAC-SHA256 signatures and hash-chain continuity.",
        colSpan: "md:col-span-2",
        layout: "featureWide",
        asset: "/feature-assets/receipt-chain.png",
        assetKey: "receipt-chain",
        alt: "Glossy 3D chain with receipt tag",
        variant: "primary",
      },
      {
        title: "Schema Drift Detection",
        description: "Pin tool schemas with SHA-256 hashes and alert when MCP tool definitions silently change.",
        colSpan: "md:col-span-1",
        layout: "featureNarrow",
        asset: "/feature-assets/schema-drift.png",
        assetKey: "schema-drift",
        alt: "Glossy 3D magnifying glass inspecting a schema",
        variant: "standard",
      },
      {
        title: "Simulation Mode",
        description: "Dry-run policy outcomes and spend impact before anything executes for real.",
        colSpan: "md:col-span-1",
        layout: "featureNarrow",
        asset: "/feature-assets/simulation-flask.png",
        assetKey: "simulation-flask",
        alt: "Glossy 3D lab flask",
        variant: "standard",
      },
    ],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  sequence: "01" | "02" | "03";
  title: string;
  helper: string;
  features: ReadonlyArray<{
    title: string;
    description: string;
    colSpan: "md:col-span-1" | "md:col-span-2";
    layout: keyof typeof baseClassByLayout;
    asset: string;
    assetKey: ThreeDAssetKey;
    alt: string;
    variant: "primary" | "standard";
  }>;
}>;

export default function FeaturesGrid() {
  return (
    <section id="features" className="w-full py-16 flex flex-col gap-16">
      <SectionShell className="flex flex-col gap-16">
        <div className="max-w-4xl">
          <h2 className="text-4xl md:text-5xl font-medium tracking-tighter leading-tight">
            Everything you need to govern AI actions. <span className="text-accent/75">Nothing you don&apos;t.</span>
          </h2>
        </div>

        <div className="flex flex-col gap-8">
          {featureGroups.map((group) => (
            <div key={group.id} className="border border-zinc-800">
              <div className="grid grid-cols-1 border-b border-zinc-800 md:grid-cols-12">
                <div className="border-b border-zinc-800 bg-zinc-950/65 px-6 py-5 md:col-span-3 md:border-b-0 md:border-r">
                  <div className="font-mono text-xs uppercase tracking-[0.2em] text-accent/80">
                    {group.sequence}
                  </div>
                </div>
                <div className="bg-zinc-950/35 px-6 py-5 md:col-span-9">
                  <div className="text-sm font-mono uppercase tracking-[0.16em] text-subtle">
                    {group.title}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-secondary">
                    {group.helper}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4">
                {group.features.map((feature) => (
                  <div
                    key={feature.title}
                    className={`group flex flex-col overflow-hidden border-r border-b border-zinc-800 transition-colors duration-500 ${feature.colSpan} ${feature.variant === "primary" ? "min-h-96 hover:bg-zinc-800/20" : "min-h-88 hover:bg-zinc-800/15"}`}
                  >
                    <div className={`relative flex items-center justify-center overflow-hidden bg-[#09090b] p-6 ${feature.variant === "primary" ? "min-h-56" : "min-h-48"}`}>
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(63,63,70,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(63,63,70,0.2)_1px,transparent_1px)] bg-size-[2rem_2rem] opacity-30" />
                      <div className={`absolute inset-x-8 top-1/2 -translate-y-1/2 blur-3xl transition-opacity duration-500 ${feature.variant === "primary" ? "h-24 bg-accent/16 group-hover:opacity-95" : "h-20 bg-accent/12 group-hover:opacity-90"}`} />
                      <Image
                        src={feature.asset}
                        alt={feature.alt}
                        width={1254}
                        height={1254}
                        sizes={feature.colSpan === "md:col-span-2" ? "(min-width: 768px) 24vw, 72vw" : "(min-width: 768px) 18vw, 72vw"}
                        style={getAssetScaleStyle(feature.assetKey, feature.variant === "primary" ? 1.05 : 1.035)}
                        className={`relative z-10 h-auto origin-center object-contain drop-shadow-[0_24px_42px_rgba(0,0,0,0.44)] transition duration-500 ease-out will-change-transform [transform:scale(var(--asset-scale))] group-hover:[transform:scale(var(--asset-hover-scale))] ${baseClassByLayout[feature.layout]}`}
                      />
                    </div>
                    <div className={`mt-auto flex flex-col ${feature.variant === "primary" ? "gap-3 p-8 md:p-9" : "gap-3 p-7 md:p-8"}`}>
                      <h3 className={`font-medium tracking-tight text-white transition-colors duration-300 ${feature.variant === "primary" ? "text-2xl group-hover:text-accent" : "text-xl group-hover:text-accent/90"}`}>
                        {feature.title}
                      </h3>
                      <p className={`leading-relaxed ${feature.variant === "primary" ? "text-sm text-secondary" : "text-sm text-zinc-400"}`}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );
}
