# ActionFence Design System & Anti-Slop Guidelines

This document locks in the visual language for the ActionFence landing page. It explicitly outlines the architectural choices that worked, and the generic AI UI tropes that have been permanently banned from this project.

## ❌ What DID NOT Work (Banned "AI Slop" Patterns)
The following patterns were attempted, failed the aesthetic test, and are strictly banned from all future sections:

1. **The "Cybersecurity" Reflex Palette**: Deep navy backgrounds, electric blue accents, and neon glows. This makes the product look like a generic, cheap template.
2. **Floating "Glass" Terminals**: Code blocks placed inside rounded, floating, translucent windows with "Mac OS" dots (red/yellow/green) and drop shadows. 
3. **The 3-Card Grid**: Three equally sized cards (Icon + Heading + Text) placed in a row. This is the most common and lazy AI UI pattern.
4. **Decorative Glows & Blurs**: Using large `blur-[120px]` background elements to create "ambient lighting."
5. **Floating Badges**: Pill-shaped badges (e.g., "Status: Protected") floating over the UI to simulate interactivity.
6. **Icons for the sake of Icons**: Using generic shield or lock icons as logos or space-fillers.

---

## ✅ What WORKED (The Locked-In Aesthetic)
We are using a **Monochrome Brutalist / Editorial** design language. It feels raw, serious, expensive, and deeply structural.

### 1. Color Palette (Strictly Austere)
- **Background**: `zinc-950` (`#09090b`). No blue tints.
- **Foreground**: `zinc-50` (`#fafafa`) for primary text.
- **Muted**: `zinc-500` to `zinc-600` for secondary text and structural numbers.
- **Borders**: `zinc-800` (`#27272a`) for all dividing lines.
- **Accents**: Pure white or extremely subtle monochromatic shifts. NO saturated accent colors unless explicitly simulating terminal syntax highlighting.

### 2. Typography
- **Massive & Severe**: Headlines should use `text-5xl` up to `text-[7rem]`.
- **Tight Tracking**: Always use `tracking-tighter` and tight line heights (`leading-[0.95]`).
- **Font Stack**: System fonts (Geist/Inter). No serifs.
- **Structural Typography**: Use raw monospace fonts (`font-mono`) for labels, code, and decorative numbers (e.g., "01", "02").

### 3. Layout & Structure
- **Asymmetric Grids**: Use `grid-cols-12` and explicitly define asymmetric spans (e.g., `col-span-4` left, `col-span-8` right).
- **Wireframe Borders**: Instead of drawing "cards" with padding and shadows, draw borders directly on the layout structure using `divide-y`, `border-t`, `border-b` against `zinc-800`.
- **Sticky Elements**: Use `sticky top-32` for section headers while content scrolls by on the opposite side.
- **Flatness**: Zero `box-shadow`. Zero `backdrop-blur`. Everything must sit perfectly flat on the Z-axis.

### 4. Motion
- **Restrained Framer Motion**: Animations should use custom easing `ease: [0.16, 1, 0.3, 1]` (Expo Out).
- **No Bouncy Springs**: Motion should feel deliberate and heavy, not bouncy or playful. 
- **Staggered Reveals**: Elements should slide up by `10px` or `20px` (not massive distances) and fade in.

---

## 🏗️ Directives for Upcoming Sections

### Phase 4: How It Works & Features Grid
- Do NOT use cards for the features.
- Build a **Wireframe Bento Grid**: A massive CSS grid where borders connect perfectly like a blueprint or terminal table. Use `border-l` and `border-t` on the parent, and `border-r` and `border-b` on the children.
- Keep micro-animations strictly typographic (e.g., text scrambling or raw layout shifting).

### Phase 5 & 6: Code, Trust Model, Receipts
- **Code Tabs**: Build them like an IDE terminal pane. Sharp corners, raw syntax colors.
- **Receipt Chain**: Represent the hash chain via raw data blocks stacked visually, not glowing blockchain UI.
