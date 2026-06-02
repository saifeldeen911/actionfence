# ActionFence Critique Fix Plan

This file turns the June 1, 2026 critique into an execution backlog.

Use it as the working log for future passes. Update `Status`, `Completed`, and `Notes` as fixes land.

## Scope

- Surface: `landing/actionfence/app/page.tsx`
- Audit basis: manual design critique, browser inspection, mobile snapshot, Lighthouse mobile snapshot
- Goal: resolve the critique findings without losing the project’s kinetic identity

## Current Direction

- Brand system status: `updated`
- Source of truth: [DESIGN.md](./DESIGN.md)
- Chosen direction: `rewrite around kinetic infrastructure, not monochrome brutalism`

## Status Key

- `not started`
- `in progress`
- `done`
- `deferred`

## Findings Backlog

| ID | Severity | Area | Issue | Planned Fix | Files / Sections | Status |
|---|---|---|---|---|---|---|
| AF-01 | P1 | Brand system | The code and the design rules disagree on the visual identity. | Rewrite the brand system around the kinetic direction and use that doc as the new standard. | `DESIGN.md` | done |
| AF-02 | P1 | Mobile hero | Mobile first viewport spends too much height on header and display drama before the main action. | Compress header height, reduce hero text footprint, and pull one clear action higher. | `components/ui/SiteHeader.tsx`, `components/ui/Hero.tsx` | done |
| AF-03 | P1 | Narrative | The page repeats the same promise too many times across trust, proof, comparison, prompt, and footer sections. | Rebuild the page arc around `risk -> mechanism -> proof -> install`, then merge or remove redundant sections. | `app/page.tsx`, `components/ui/TrustModel.tsx`, `components/ui/ReceiptChain.tsx`, `components/ui/Footer.tsx` | done |
| AF-04 | P2 | Contrast | Accent and muted text are under contrast threshold in tabs, small labels, trust markers, code tokens, and footer links. | Raise the secondary text floor, brighten inactive states, and stop using low-opacity accent as functional text. | `app/globals.css`, `components/ui/Hero.tsx`, `components/ui/CodeExamples.tsx`, `components/ui/TrustModel.tsx`, `components/ui/Footer.tsx`, Lighthouse report | done |
| AF-05 | P2 | CTA trust | Clipboard actions can show success even when clipboard write fails. | Only show copied state after success and expose a fallback message or selectable text on failure. | `components/ui/SiteHeader.tsx`, `components/ui/Hero.tsx`, `components/ui/Footer.tsx` | done |
| AF-06 | P2 | Feature hierarchy | The features grid is polished but still reads as a wall of equal capability blocks. | Group features by priority or sequence, reduce sameness, and introduce stronger scan order. | `components/ui/FeaturesGrid.tsx` | done |
| AF-07 | P2 | Trust model clarity | The trust diagram is conceptually useful, but the accent treatment is too faint and too decorative. | Increase label contrast, simplify accent usage, and make the system read more infrastructurally. | `components/ui/TrustModel.tsx` | not started |
| AF-08 | P2 | Receipt proof tone | The receipt chain communicates proof, but the lower-opacity second receipt makes the artifact feel less authoritative. | Increase density and legibility, remove any visual treatment that makes proof feel disposable. | `components/ui/ReceiptChain.tsx` | not started |
| AF-09 | P2 | Footer duplication | The prompt box, stats bar, and final shell CTA create multiple overlapping conversion endings. | Decide on one dominant closing conversion pattern and simplify the rest. | `components/ui/Footer.tsx` | not started |
| AF-10 | P3 | Supporting copy | The page introduces technical terms too early for first-time visitors. | Add a slightly clearer plain-language bridge in the hero and tighten jargon density in early sections. | `components/ui/Hero.tsx`, `components/ui/ProblemStatement.tsx`, `components/ui/HowItWorks.tsx` | not started |

## Recommended Order

1. `AF-02` mobile hero
2. `AF-03` narrative compression
3. `AF-04` contrast
4. `AF-05` CTA trust
5. `AF-06` features hierarchy
6. `AF-07` trust model clarity
7. `AF-08` receipt proof tone
8. `AF-09` footer duplication
9. `AF-10` supporting copy

## Fix Notes

### AF-01 Completed

- Replaced the old monochrome-brutalist design rules with a kinetic-infrastructure system.
- Aligned the visual contract with the current hero field, directional light, asymmetry, and engineered containment language.
- Added explicit rules for contrast, mobile first viewport, and narrative compression so future UI passes do not drift.

### AF-02 Completed

- Replaced the mobile inline nav row with a compact menu trigger so the header stops competing with the hero on first load.
- Added a bordered mobile menu panel that keeps the nav links and `npm install` CTA inside the same dark control-surface language.
- Reduced mobile hero padding, tightened headline scale, and raised supporting copy plus the install panel higher in the first viewport.

### AF-03 Completed

- Removed the standalone comparison section from the page flow to stop repeating the same claims after proof and use cases.
- Rewrote the trust model to focus on enforcement mechanics and bypass resistance, then kept all proof language in receipt-chain only.
- Removed the AI-assistant prompt pre-footer block and kept one dominant install ending, with compact stats and resource links as support.

### AF-04 Completed

- Added semantic contrast-floor tokens in `app/globals.css`: `secondary` (`#a1a1aa`) and `subtle` (`#7a7a85`).
- Replaced low-opacity accent and under-floor muted text in hero tabs/controls, code example tabs/tokens, trust model markers/labels, and footer links/meta labels.
- Chrome DevTools MCP Lighthouse result improved from a single `color-contrast` failure to clean passes on both targets:
  - Mobile (`2026-06-01`): Accessibility `100`, Failed audits `0`.
  - Desktop (`2026-06-01`): Accessibility `100`, Failed audits `0`.

### AF-05 Completed

- Added a shared clipboard helper hook with explicit `idle | success | error` state and non-throwing `copy()` behavior.
- Updated header and hero CTA copy buttons to show success only on confirmed clipboard writes and to render inline manual-copy fallback text on failure.
- Added selectable fallback content in failure mode:
  - Header: selectable `npm install actionfence` fallback hint for desktop and mobile menu.
  - Hero: selectable install command for human tab, and readonly selectable prompt block for agent tab.
- Footer required no clipboard code change because it does not include a clipboard action and already presents selectable install commands.
- Chrome DevTools MCP verification (`2026-06-01`):
  - Success path: desktop and mobile copy controls show temporary success state, then reset.
  - Forced failure path (monkey-patched `navigator.clipboard.writeText`): no false-success state, no uncaught promise error, and manual-copy fallback content is shown.

### AF-06 Completed

- Replaced the flat features catalog with an execution-sequence structure: `01 Policy Setup` → `02 Runtime Enforcement` → `03 Oversight & Recovery`.
- Reordered all 8 capabilities under the sequence groups and added one-line helper copy per group to make scan intent explicit.
- Introduced hierarchy inside each group:
  - first capability is rendered as a `primary` card (larger title, taller media block, stronger accent hover)
  - remaining capabilities render as `standard` cards
- Kept the existing kinetic grid language (borders, 3D assets, dark field treatment) while reducing “equal card” sameness.
- Chrome DevTools MCP verification (`2026-06-01`):
  - Desktop (`~1300px`): all three group headers appear in order and each group has one clearly dominant primary card.
  - Mobile (`~390px`): each group renders as `header → cards` in the intended sequence with no mixed ordering.
  - A11y snapshot: heading flow remains valid (`h2` section heading, `h3` feature titles), and text readability remains intact.

## Working Checklist

- [x] Rewrite the brand system around the kinetic direction
- [x] Fix mobile hero conversion path
- [x] Compress the page narrative
- [x] Resolve color contrast failures
- [x] Harden clipboard feedback
- [x] Rebalance the features grid
- [ ] Refine the trust model
- [ ] Strengthen the receipt proof visuals
- [ ] Simplify the footer conversion stack
- [ ] Clarify early-stage copy

## How To Continue

- Update this file after every pass.
- When a fix ships, add a short note under `Fix Notes` with what changed and any follow-up.
- If a finding turns out to require a larger restructure, split it into child items rather than letting the row become vague.
