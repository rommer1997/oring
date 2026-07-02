# ElenaOS — Project Intelligence

## Product
ElenaOS is a SaaS for beauty salon management. The public-facing product is branded **Elena Salon**. The design system is the ElenaOS chapbook identity.

## Design System — NON-NEGOTIABLE
Full spec: `elena-style-reference.md`. Summary of hard rules:

### Colors (full-bleed fields, never small accents)
- `#062d32` Ink Teal — all primary type, linework, nav
- `#c9a9b5` Dusty Rose — hero, footer (envelope effect)
- `#aa9e54` Mustard Olive — forms, booking, function sections
- `#ffffff` Paper White — editorial/about sections
- `#767676` Mid Gray — ONLY for input bottom borders
- `#000000` Carbon — form labels, submit button text

### Typography
- **Serif:** EB Garamond (sub for BasicCommercial) — body, headings, display. Weight 300.
- **Sans:** Work Sans (sub for Elementa) — nav, labels, buttons. ALWAYS uppercase + letter-spacing 0.042em.
- Scale: caption 16px / subheading 19px / heading 38px / display 49px

### Shape & Elevation
- `border-radius: 0px` EVERYWHERE — no exceptions
- NO shadows, NO gradients, NO elevation
- Depth = section color shifts only

### Components
- Inputs: bottom-border only (1px #767676), transparent bg
- Buttons: 1px solid #000000 outline, transparent fill — NEVER filled
- Nav: transparent bg, 3px bottom border on hover only
- Sections: 100–150px vertical padding, full-bleed width

## Tools

### Ponytail (active, full intensity)
- Use stdlib/native CSS before any library
- Shortest working diff wins
- No abstractions with one implementation
- No boilerplate for later
- Mark simplifications: `/* ponytail: ... */`

### Gstack skills available
/office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /design-shotgun, /design-html, /review, /ship,
/qa, /qa-only, /design-review, /retro, /investigate, /cso, /careful,
/document-release, /document-generate

Use `/review` before every significant commit.
Use `/design-shotgun` when exploring layout variants.
Note: `/qa` and `/browse` require browser access — not available in this CCR environment.

## File Structure (current)
```
/home/user/oring/
├── index.html              ← Landing page (Elena Salon)
├── styles.css              ← Full design system CSS
├── simulator.js            ← Revenue recovery calculator
├── elena-style-reference.md ← Canonical design spec
└── CLAUDE.md               ← This file
```

## Code Style
- Plain HTML/CSS/JS unless a framework is explicitly agreed
- CSS custom properties from `styles.css` — never hardcode hex values
- SVG illustrations: #062d32 stroke, no fill, ~1.5px stroke-width
- No external UI libraries (no Tailwind, no shadcn, no Bootstrap)
- Comments only when WHY is non-obvious

## Security — NON-NEGOTIABLE (regla anti-EnrichLead)
El navegador nunca es de fiar: todo lo que llega al cliente es visible y editable.
- **Secretos SOLO en `process.env` del servidor** (Stripe, Gemini, Meta WA, service account). NUNCA hardcodeados, NUNCA con prefijo `VITE_` (todo `VITE_*` se empaqueta en el bundle público).
- **Autorización SIEMPRE en el servidor**: `verifyIdToken` + tenant derivado del servidor. Jamás confiar en un flag de pago/rol enviado por el cliente.
- **Campos de billing** (`subscriptionStatus`, `trialEndsAt`, `stripe*`) son inmutables desde el cliente — solo los escriben los webhooks de Stripe vía Admin SDK. Ver `firestore.rules`.
- **Firestore**: default `deny-all` + aislamiento por tenant + validación de esquema. No relajar.
- **Rate limiting** en todos los endpoints (`apiLimiter`/`publicLimiter`/`aiLimiter`) + cuota per-user en IA.
- **Guard automático**: `scripts/check-secrets.mjs` corre en `prebuild` (local) y en CI tras el build (escanea el bundle real). Rompe el build si un secreto se cuela. La Firebase client `apiKey` (`AIza…`) es pública por diseño — no es un secreto, no perseguirla.

## Commit Convention
- Descriptive imperative: "Add pricing section", "Fix simulator ROI calc"
- No emoji, no Claude branding in commit messages
