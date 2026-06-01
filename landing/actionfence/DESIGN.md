# ActionFence Design System

This document is the active visual contract for the ActionFence landing page.

The previous direction pushed the project toward austere monochrome brutalism. The shipped UI has already moved elsewhere: luminous motion, field tension, indigo signal color, and kinetic infrastructure imagery. This file makes that shift explicit so future work stops fighting the codebase.

## Core Direction

ActionFence should feel like **governed energy**:

- not a generic cybersecurity dashboard
- not a flat editorial specimen page
- not glossy AI slop
- not playful consumer futurism

The page should communicate:

1. **High stakes**: agents can spend money, call tools, and cause damage.
2. **Containment**: ActionFence intercepts, constrains, and verifies.
3. **Velocity**: integration is fast, the system is not bureaucratic.

The visual language is **kinetic infrastructure**:

- dark environment
- directional light
- restrained but visible motion
- strong asymmetry
- engineered surfaces
- signal color used as guidance, not decoration

---

## Anti-Slop Bans

These remain banned:

1. **The generic cybersecurity palette**: deep navy plus electric blue neon with arbitrary glows.
2. **Floating glass windows**: blurred translucent cards, fake desktop chrome, and ornamental depth.
3. **The generic 3-card feature row**: icon, heading, paragraph, repeated without tension.
4. **Meaningless ambient blur**: giant blobs or haze with no directional role.
5. **Floating pills and fake status badges**: decorative UI cosplay.
6. **Icons with no narrative job**: shields, locks, and checkmarks used as filler.
7. **Terminal cosplay everywhere**: not every box should look like a code window.
8. **Duplicate CTA blocks**: if two sections ask for the same action in the same way, one should be removed.
9. **Low-contrast signal text**: muted or accent text below usable contrast on dark backgrounds.

---

## Design Principles

### 1. Energy Must Be Directed

Motion and light are allowed only when they point attention, indicate flow, or reinforce containment.

- Hero motion can create atmosphere.
- UI motion should stay short, deliberate, and task-adjacent.
- Decorative motion that does not clarify hierarchy is noise.

### 2. Signal Beats Decoration

The accent color is a **signal system**, not paint.

- use it for active states, directional emphasis, critical words, and controlled focus
- do not use it for every label, border, and secondary note
- never fade the accent so far down that it stops functioning as a signal

### 3. Containment Over Flatness

The old system overcorrected toward pure flatness. The new rule is not “zero depth,” it is **purposeful containment**.

- surfaces may have layered light or dimensional imagery
- containment should come from borders, framing, alignment, and directional composition
- depth must feel engineered, not frosted or plush

### 4. Narrative Compression

Each section must advance the story instead of restating the same promise.

Required arc:

1. risk
2. mechanism
3. proof
4. installation

If a section does not deepen one of those four beats, it should be merged, reduced, or removed.

### 5. First Viewport Must Convert

Especially on mobile, the first viewport must deliver three things fast:

1. what this is
2. why it matters
3. what to do next

Spectacle is allowed only if those three remain visible and legible.

---

## Color System

### Palette Roles

- **Base void**: `#09090b`
- **Raised dark**: `#111319` to `#141722`
- **Structural border**: `#27272a`
- **Primary text**: `#f5f7fb`
- **Secondary text**: `#a1a1aa` minimum, brighter when interactive
- **Signal indigo**: `#7c83ff`
- **Signal indigo bright**: use sparingly for active emphasis only
- **Cold haze**: low-opacity indigo light for directional illumination

### Rules

- Keep the page predominantly dark and neutral.
- Indigo is the committed signal, not a rainbow system.
- Background lighting should read as a field or beam, not a glow blob.
- Accent text used for interaction must meet contrast requirements.
- Secondary copy should not fall below readable contrast just to look “soft.”

### What To Avoid

- blue-on-black hacker cliché
- purple used on every component equally
- gray-on-black that disappears in real use
- gradients used as text fill

---

## Typography

### Voice

Typography should feel **urgent, technical, and controlled**.

- massive hero display is allowed
- supporting copy should calm the page down
- mono is structural, not dominant

### Rules

- Hero headlines may stay oversized, but lower sections need tighter discipline.
- Use sans for major communication, mono for metadata, commands, labels, and proofs.
- Avoid repeating tiny uppercase mono kickers above every heading unless they add navigation value.
- Supporting copy must be easier to read than it is today on mobile.

### Hierarchy

- display: severe, compressed, high contrast
- section heading: still bold, but not all sections need hero-level drama
- body: calmer, clearer, brighter than decorative labels
- metadata: mono, small, deliberate, never the main voice

---

## Layout And Composition

### Structure

- Asymmetric composition remains correct.
- Border-based framing remains correct.
- Wide-section rhythm remains correct.

### New Emphasis

- Use composition to create **flow vectors**.
- Let the wave field and major diagonals guide the eye.
- Balance high-energy zones with quiet reading zones.
- Avoid turning every section into a self-contained framed object.

### Mobile

- compress top navigation
- reduce dead space above the value proposition
- keep one primary CTA visible early
- do not let decorative scale push core messaging below the fold

---

## Motion

### Allowed

- slow background field drift
- short reveal transitions
- directional hover states
- tab changes with clear state transfer
- proof-chain or data-flow motion where the concept benefits

### Not Allowed

- bounce
- elastic easing
- oversized travel distances
- constant competing animation in multiple regions

### Motion Standard

- use `ease: [0.16, 1, 0.3, 1]`
- entrance shifts should usually stay within `10px` to `20px`
- looping motion should be slow and quiet enough that copy remains primary

---

## Imagery

Imagery is allowed and expected, but it must feel like **machined signal objects**, not toy icons.

- 3D assets should support the concept of control, flow, identity, and verification
- the lighting language should match the hero field
- if an asset feels too cute, too glossy, or too detached from the system, replace it
- imagery should look integrated into the environment, not pasted into cards

---

## Component Directives

### Hero

- Keep the kinetic field.
- Keep the asymmetric left-heavy headline.
- Reduce header and hero competition on mobile.
- The CTA area should feel like a control surface, not a generic card.

### Features

- Keep the connected grid.
- Reduce the sense that every feature is equal.
- Introduce stronger grouping or sequence so the grid reads as a system, not a catalog.

### Trust Model

- The diagram is useful.
- Simplify the accent usage and increase contrast.
- Make the diagram feel more infrastructural, less glowing.

### Receipt Chain

- Keep the proof metaphor.
- Increase trust and legibility.
- The proof objects should feel denser and more authoritative, not partially faded decoration.

### Footer And CTA

- Consolidate duplicated conversion moments.
- End with one decisive CTA, not multiple near-equivalents.
- Massive branding is allowed only if it does not crowd the useful footer content.

---

## Accessibility And Interaction Rules

- Interactive accent text must pass contrast on dark backgrounds.
- Inactive tabs must remain readable.
- Copy feedback must only claim success when the action succeeded.
- Focus styles must remain visible against the kinetic background.
- Motion should never make text harder to track.

---

## Current Priorities

1. Bring the brand docs in line with the kinetic direction.
2. Fix mobile first-viewport conversion.
3. Cut narrative repetition.
4. Raise the contrast floor for secondary and interactive text.
5. Harden clipboard and CTA feedback.

This file defines the target state. The execution backlog lives in `CRITIQUE_FIX_PLAN.md`.
