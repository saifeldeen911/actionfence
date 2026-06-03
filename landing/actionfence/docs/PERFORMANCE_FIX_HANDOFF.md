# ActionFence Performance Fix Handoff

Date: 2026-06-03

## Objective

Improve the `actionfence.dev` landing page performance without regressing Accessibility, Best Practices, or SEO, and fix the docs hero rerender/restart when switching between docs pages.

## Root Causes Identified

### Mobile LCP delay

The landing hero headline was the LCP element, but it lived inside a client `Hero` component and was animated from hidden state with Framer Motion. That made the visible H1 depend on JavaScript, hydration, and animation timing.

### Desktop TBT and main-thread work

Most landing sections were marked `"use client"` only for Framer reveal/hover animations. That pulled a shared Framer client chunk into the landing route and forced hydration for otherwise static sections.

The hero also started a full-viewport WebGL animation loop immediately, competing with first paint and hydration.

### Docs hero rerender

`MarkdownDocument` owned the docs header, nav, hero, and markdown body for every docs page. Navigating between docs routes destroyed and recreated the hero canvas.

### Secondary issues

`HowItWorks` had a below-fold image marked `priority`.

`next.config.ts` had conflicting CommonJS and ESM config exports.

The receipt-chain visual had low contrast in muted text after removing animation, which caused a local Lighthouse accessibility score drop to 97 until fixed.

## What Changed

### Hero/LCP

- Converted `components/ui/Hero.tsx` back to a server component.
- Removed Framer initial opacity/translate animation from the hero H1 and critical eyebrow.
- Split the interactive install tabs/copy behavior into `components/ui/HeroInstallTabs.tsx`.
- Kept the hero text visible in server-rendered HTML.

### WebGL deferral

- Added `components/ui/HeroWaveSlot.tsx` as a small client island that delays loading the WebGL component.
- Updated `components/ui/LineWaves.tsx` so it renders a static fallback first.
- WebGL now starts after idle/timeout only on capable desktop viewports.
- WebGL is skipped for mobile, `prefers-reduced-motion`, and `saveData`.

### Reduced hydration

Converted Framer-only/static components away from client components:

- `ProblemStatement.tsx`
- `HowItWorks.tsx`
- `FeaturesGrid.tsx`
- `TrustModel.tsx`
- `ReceiptChain.tsx`
- `Comparison.tsx`
- `UseCases.tsx`
- `Footer.tsx`

Kept client components only where state or browser APIs are still needed:

- `SiteHeader.tsx`
- `CodeExamples.tsx`
- `HeroInstallTabs.tsx`
- `HeroWaveSlot.tsx`
- `LineWaves.tsx`
- `DocsNav.tsx`
- `DocsHero.tsx`
- `FaultyTerminal.tsx`
- `useClipboardCopy.ts`

### Docs persistence

- Added `app/docs/layout.tsx` to own the persistent docs shell.
- Added `components/ui/DocsNav.tsx`.
- Added `components/ui/DocsHero.tsx`.
- Added `lib/docs-meta.ts` for browser-safe docs metadata.
- Updated `lib/repo-docs.ts` to reuse the shared metadata.
- Simplified `MarkdownDocument.tsx` so it only renders the markdown article.
- Updated docs pages to pass only `source` into `MarkdownDocument`.

The docs hero background now lives in the docs segment layout, so it remains mounted during same-segment docs navigation.

### Config and asset priority

- Consolidated `next.config.ts` into one `NextConfig` ESM export.
- Preserved `reactCompiler`, `allowedDevOrigins`, `turbopack.root`, and `outputFileTracingRoot`.
- Set `turbopack.root` and `outputFileTracingRoot` to the same repo root to remove the build warning.
- Removed below-fold `priority` usage from `HowItWorks`.

### Accessibility cleanup

- Removed global opacity from the second receipt card.
- Raised muted receipt text from very low-contrast zinc colors to accessible zinc colors.
- This restored local Lighthouse Accessibility to 100.

## What Worked

- `npm run build` passes cleanly in `landing/actionfence`.
- Local Lighthouse non-performance audit on `/` returned:
  - Accessibility: 100
  - Best Practices: 100
  - SEO: 100
  - Agentic Browsing: 100
- Browser verification showed desktop and mobile home layouts still render correctly.
- DOM probe confirmed the same docs canvas persists across:
  - `/docs/readme`
  - `/docs/changelog`
  - `/docs/security`
- Source scan found no app-code matches for:
  - `framer-motion`
  - `motion.`
  - `AnimatePresence`
  - `whileInView`
  - stray `priority=`
  - `module.exports`

## What Did Not Change

- No route URLs changed.
- No page metadata, canonical URL behavior, or SEO intent changed.
- No package APIs changed.
- No content/copy rewrite was performed beyond moving docs shell structure.
- `framer-motion` remains in `package.json` and `package-lock.json`, but it is no longer imported by app source.
- Large image compression/conversion was not done. PageSpeed estimated only small savings there, so this stayed secondary.

## Bugs Or Regressions Introduced And Fixed

### Temporary accessibility regression

After converting `ReceiptChain` away from Framer animation, the receipt visual still used global `opacity-75` and muted `text-zinc-600`/`text-zinc-500` labels on a near-black background. Local Lighthouse reported Accessibility 97 due to color contrast.

Fix:

- Removed the global opacity from the second receipt card.
- Raised muted receipt labels to accessible contrast.
- Rerun confirmed Accessibility 100.

### Temporary build config warning

The first consolidated `next.config.ts` had `turbopack.root` and `outputFileTracingRoot` pointing at different roots. Next warned that they should match.

Fix:

- Set both to the repo root.
- Rerun build was clean.

## Known Gaps

- A production PageSpeed run against deployed `https://www.actionfence.dev/` has not been rerun in this session.
- Dev-server Lighthouse performance is not a reliable proxy for production performance because it includes dev tooling and HMR behavior.
- `framer-motion` is still installed. It can be removed in a separate dependency cleanup if no other packages/routes need it.
- The docs hero still uses `FaultyTerminal`, which is a client WebGL/canvas effect. It now persists across docs navigation, but it may still be worth deferring or simplifying on mobile/reduced-motion if docs PageSpeed becomes a target.
- Large PNG compression/conversion remains undone.
- Generated verification artifacts were left in `tmp/` during inspection:
  - screenshots
  - trace files
  - empty next-start logs

## Verification Commands Used

```bash
cd landing/actionfence
npm run build
```

Browser checks were performed through Chrome DevTools MCP against `localhost:3001`.

Docs canvas persistence was checked by attaching a marker to the canvas DOM node on `/docs/readme`, navigating via docs nav links, and confirming the marker survived on later docs routes.

## Next Logical Step

Deploy or preview the build, then rerun PageSpeed/Lighthouse against the production-like URL for both mobile and desktop.

Focus on:

- Mobile LCP render delay.
- Desktop TBT.
- Whether `LineWaves` is absent from the initial route load and starts only after the page is interactive.
- Whether Accessibility, Best Practices, and SEO remain 100 on the deployed URL.

If performance is still below target, the next likely optimization is to simplify or further delay remaining canvas/WebGL effects, especially `FaultyTerminal` on docs and any post-load hero wave work on low-end devices.
