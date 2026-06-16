# ElenaOS — Style Reference
> Dusty rose chapbook with mustard chapter breaks
**Theme:** mixed

Elena is an editorial identity for a beauty salon management platform: three full-bleed color fields (dusty rose, warm white, mustard olive) stitched together by generous vertical breathing room and serif type that reads like a small magazine spread. Color is deployed as atmosphere, not accent — the entire page is the brand, and components are reduced to thin hairline rules, all-caps Elementa labels, and BasicCommercial serif body copy. The illustration in the hero is a single detailed line-art scene that does the storytelling work a traditional SaaS site would delegate to feature cards and metrics. Interactions are quiet: ghost buttons, borderless inputs, no shadows, no gradients, no rounded corners — the only depth comes from section-to-section color shifts.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Ink Teal | `#062d32` | `--color-ink-teal` | Primary type, illustration linework, nav wordmark, heading hairlines |
| Dusty Rose | `#c9a9b5` | `--color-dusty-rose` | Hero section field — signature chapter color, full-bleed canvas |
| Mustard Olive | `#aa9e54` | `--color-mustard-olive` | Booking, management, function-section field — full-bleed background |
| Slate Teal | `#344b52` | `--color-slate-teal` | Secondary text, link borders, tertiary headings |
| Warm Bone | `#e9e9e2` | `--color-warm-bone` | Soft canvas variant, off-white surface, hairline divider tone |
| Mid Gray | `#767676` | `--color-mid-gray` | Input rule color — form-field bottom borders only |
| Carbon | `#000000` | `--color-carbon` | Maximum-contrast text, form labels, submit-button type |
| Paper White | `#ffffff` | `--color-paper-white` | Default page canvas, lightest section field |

## Tokens — Typography

### BasicCommercial LT Com Roman — `--font-basiccommercial-lt-com-roman`
- **Substitute:** Freight Text Pro, Lora, EB Garamond
- **Weights:** 300, 400
- **Sizes:** 19px, 38px, 49px
- **Line height:** 1.16–1.20
- **Letter spacing:** 0.003em–0.026em (tight on display, ~0.026em on body)
- **Role:** Primary serif for body copy and mid-size headings. Editorial lifting — long-form descriptions, section headers, booking copy.

### Adobe Caslon — `--font-adobe-caslon`
- **Substitute:** Caslon, Garamond Premier Pro Display, EB Garamond
- **Weights:** 300
- **Sizes:** 49px
- **Line height:** 1.18
- **Letter spacing:** 0.003em
- **Role:** Display serif for the largest editorial headings only. Typographic event.

### Elementa — `--font-elementa`
- **Substitute:** Suisse Int'l, Inter, Work Sans
- **Weights:** 300, 400
- **Sizes:** 16px, 19px
- **Line height:** 1.00–1.16
- **Letter spacing:** 0.042em on small caps (the single most distinctive micro-typographic decision)
- **Role:** Geometric sans for nav, buttons, form labels, wordmark. ALWAYS small caps + positive tracking.

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| caption | 16px | 1.16 | 0.67px | `--text-caption` |
| subheading | 19px | 1.18 | 0.5px | `--text-subheading` |
| heading | 38px | 1.2 | 0.15px | `--text-heading` |
| display | 49px | 1.18 | 0.15px | `--text-display` |

## Tokens — Spacing & Shapes

**Base unit:** 4px | **Density:** spacious

| Name | Value | Token |
|------|-------|-------|
| 8 | 8px | `--spacing-8` |
| 20 | 20px | `--spacing-20` |
| 40 | 40px | `--spacing-40` |
| 68 | 68px | `--spacing-68` |
| 100 | 100px | `--spacing-100` |
| 136 | 136px | `--spacing-136` |

### Border Radius — ALL ZERO
| Element | Value |
|---------|-------|
| tags | 0px |
| cards | 0px |
| inputs | 0px |
| buttons | 0px |

### Layout
- **Page max-width:** 1200px
- **Section gap:** 150px
- **Card padding:** 27px
- **Element gap:** 23px

## Components

### Top Navigation Bar
Single horizontal row full viewport. Wordmark left in Elementa small caps. Nav links spread across top, 35px column gap, Elementa weight 300 ~16px letter-spacing 0.042em, color #062d32. No background fill — sits on section color below. Sticky, minimal.

### Hero Illustration Panel
Full-bleed #c9a9b5. Single editorial line-art illustration in #062d32 stroke, ~60% viewport. No headline, no CTA — illustration IS the hero. ~150px vertical padding.

### Centered Serif Body Block
White or off-white full-bleed. BasicCommercial weight 300–400, ~38–49px, centered, max-width ~900px. One paragraph, one column, no sidebar.

### Section Heading (Serif Display)
Centered, BasicCommercial or Caslon weight 300, ~38–49px, line-height 1.18. Color #000000 on colored fields, #062d32 on white. Chapter title — no eyebrow, no kicker.

### Underline Input Field
Bottom-border-only input. 1px bottom border in #767676. NO box, NO fill, NO radius. Label in Elementa small caps ~16px 0.042em #000000, 8px gap above input. Input text BasicCommercial weight 400 ~19px #062d32.

### Outlined Submit Button
Full-width 1px black border, transparent fill, 27px vertical padding. Elementa small caps weight 300 letter-spacing 0.042em #000000. NO radius, NO shadow, NO fill on hover — border only.

### Ghost Nav Link
Elementa weight 300, 16px, 0.042em. No underline default; 3px bottom border #062d32 on hover/active. 3px padding-bottom. ONLY state change.

### Footer (Dusty Rose Repeat)
Repeats #c9a9b5. Creates envelope effect. Same #062d32 linework treatment.

## Do's

- Use three chapter colors as full-bleed section fields: #c9a9b5 rose, #aa9e54 mustard, #ffffff white. Never tint, mix, or apply as small accents.
- Set ALL labels, nav items, button text in Elementa small caps with 0.042em letter-spacing.
- Use #062d32 for all primary type and linework. Reserve #000000 for highest-contrast moments (labels, submit).
- 100–150px vertical padding per section. Page breathes like a printed page.
- Bottom-border-only inputs (1px #767676). Input IS a printed line on a colored page.
- One large serif paragraph (BasicCommercial 38–49px) carries editorial sections.
- ALL corners sharp — 0px radius everywhere.

## Don'ts

- NO filled CTA button. Only outlined submit (1px black border, transparent fill).
- NO shadows, NO gradients, NO elevation effects.
- NO photography, product shots, 3D renders. Line-art in #062d32 ONLY.
- DO NOT apply chapter colors as small accents, badges, or icon fills — full-bleed fields only.
- NO sticky floating bars, mega-menus, sidebars. Top bar is the only chrome.
- NO rounded corners, pill shapes, border-radius anywhere.
- NO multiple sans-serif weights for hierarchy — use serif/sans pairing + size.

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 1 | Paper White | `#ffffff` | Default canvas, editorial sections |
| 2 | Warm Bone | `#e9e9e2` | Secondary surfaces, hairline-rule tone |
| 3 | Dusty Rose | `#c9a9b5` | Hero and atmospheric chapter field |
| 4 | Mustard Olive | `#aa9e54` | Booking, management, form chapter field |

## Elevation

**Deliberately absent.** No shadows, glows, depth effects. Depth = section-to-section color shifts only. All components flat on their color fields, hairline borders as sole divider.

## Imagery

Single hero illustration, detailed editorial line-art, fine ~1.5px strokes in #062d32 on #c9a9b5 field. No photography anywhere. No product shots, lifestyle photos, abstract graphics. The illustration is the entire visual identity, appears once at full scale.

## Layout

Full-bleed section stack. 100% viewport width sections alternating: dusty rose (hero/footer) → paper white (editorial) → mustard olive (forms/functions). Content centered, ~1200px max-width. Generous section padding (100–150px). No card grids, no pricing tables, no feature columns — vertical storytelling.

## CSS Custom Properties (Quick Reference)

```css
:root {
  --color-ink-teal: #062d32;
  --color-dusty-rose: #c9a9b5;
  --color-mustard-olive: #aa9e54;
  --color-slate-teal: #344b52;
  --color-warm-bone: #e9e9e2;
  --color-mid-gray: #767676;
  --color-carbon: #000000;
  --color-paper-white: #ffffff;

  --font-serif: 'EB Garamond', 'Lora', Georgia, serif;
  --font-sans: 'Work Sans', 'Inter', system-ui, sans-serif;

  --text-caption: 16px;
  --text-subheading: 19px;
  --text-heading: 38px;
  --text-display: 49px;

  --tracking-stamp: 0.042em;
  --tracking-tight: 0.003em;

  --spacing-8: 8px;
  --spacing-20: 20px;
  --spacing-40: 40px;
  --spacing-68: 68px;
  --spacing-100: 100px;
  --spacing-136: 136px;

  --page-max-width: 1200px;
  --section-gap: 150px;
  --card-padding: 27px;
  --element-gap: 23px;
  --radius: 0px;
}
```

## Agent Prompt Guide (Quick Color Reference)

- **text:** #062d32 (Ink Teal)
- **background:** #ffffff (Paper White)
- **border:** #767676 for inputs, #062d32 for nav/illustration
- **accent:** #c9a9b5 (Dusty Rose) and #aa9e54 (Mustard Olive) — full-bleed ONLY, never small UI accents
- **primary action:** outlined, 1px #000000 border, transparent fill

## Component Example Prompts

1. **Hero Section**: Full-bleed #c9a9b5, 150px padding. SVG line-art #062d32 centered ~60% viewport. No headline, no CTA.
2. **About / Editorial**: Full-bleed #ffffff, 150px padding. EB Garamond 300, 49px, line-height 1.18, #062d32, max-width 900px, centered.
3. **Section Heading on Mustard**: Full-bleed #aa9e54, 150px top. EB Garamond 300, 49px, #000000, centered.
4. **Form**: 2-col grid (50/50, 27px row gap) on #aa9e54. Elementa small-caps label (16px, 0.042em, #000000) + 1px #767676 bottom-border input, BasicCommercial 19px #062d32. No boxes, no fill, 0px radius.
5. **Nav**: Full width, transparent. Wordmark left, Elementa 16px small caps 0.042em #062d32. Links same spec, 35px gap, 3px #062d32 bottom border on hover.
