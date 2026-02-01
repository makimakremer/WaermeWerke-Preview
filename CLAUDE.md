# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WärmeWerke is a static marketing website for ThermoHybrid energy systems (KWK/Kraft-Wärme-Kopplung). No build process required - plain HTML/CSS/JS served directly.

**Domain:** waermewerke.de
**Language:** German (de)

## Development

**Local preview:**
```bash
python3 -m http.server 8000
# or
npx serve .
```

**No build/lint/test commands** - this is a static site without tooling.

## Architecture

### Pages (HTML)
- `index.html` - Homepage with 7-chapter Editorial Storytelling structure
- `produkt-*.html` - Product detail pages (ThermoHybrid, H2 Storage, Comfy Plus 75, Renso Kompakt, Titan)
- `wirtschaftlichkeit.html` - ROI calculator with detailed BHKW analysis
- `foerderung.html` - Funding/subsidies info (KWKG, BEW)
- `funnel.html` - Standalone lead qualification funnel
- `blog.html` - Blog with Supabase backend
- `referenzen.html` - Customer references
- `welcome.html` - Thank-you page after form submission

### JavaScript Modules
| File | Purpose |
|------|---------|
| `script.js` | Main bundle: navigation, reveal animations, parallax, FAQ accordion, toast notifications, number counters, editorial scroll animations |
| `calculator.js` | BHKW economics calculator - lazy loaded on wirtschaftlichkeit.html |
| `blog.js` | Blog reader with Supabase fetch, DOMPurify sanitization, filtering |
| `funnel.js` | Standalone funnel logic |
| `admin.js` | Blog admin portal with Supabase auth |

### CSS Design System (`style.css`)

**CSS Variables (prefixed `--ww-*`):**
- Colors: `--ww-primary` (violet), `--ww-secondary` (cyan), `--ww-accent` (pink), `--ww-energy` (green), `--ww-error` (red)
- Spacing: `--space-1` through `--space-24` (8px grid system)
- Motion: `--duration-fast/normal/slow`, `--ease-out/in/bounce`
- Fonts: Poppins (display), Inter (body)

**Component Systems:**
- **Buttons:** `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-icon` with sizes (`.btn-sm`, `.btn-lg`) and states (`:disabled`, `.btn-loading`)
- **Forms:** `.form-group` with floating labels, validation states (`.is-valid`, `.is-error`, `.is-loading`)
- **Editorial:** `.chapter`, `.grid-editorial`, `.statement`, `.reveal`

### External Services
- **Forms:** FormSubmit.co (action URLs point to info@waermewerke.de)
- **Blog Backend:** Supabase (table: `posts`)
- **Analytics:** Google Analytics (currently disabled)

## Key Patterns

### Editorial Storytelling (index.html)
The homepage uses a chapter-based scroll narrative:
```html
<section class="chapter chapter-hero" id="hero">...</section>
<section class="chapter chapter-problem" id="problem">...</section>
```
Each chapter is full-viewport height with scroll-triggered animations.

### Toast Notifications (JavaScript)
```javascript
WW.toast.success('Title', 'Message');
WW.toast.error('Title', 'Message');
WW.toast.warning('Title', 'Message');
WW.toast.info('Title', 'Message');
```

### Number Counter Animation
```html
<span class="counter" data-target="120" data-suffix="+">0</span>
```
Automatically animates when scrolled into view.

### Reveal Animations
Add `.reveal` class to elements for fade-in on scroll. Use `.reveal-stagger` on parent for sequential child animations.

### Funnel System
Uses `data-*` attributes for state management:
- `data-funnel` - Container
- `data-step-id` - Step identifier
- `data-funnel-form` - Final form

### Calculator
BHKW unit selection based on thermal load (`bhkwEinheiten` array).
Formula: `heizlast = verbrauch / 3000`

## Branding Notes
- Company: **WärmeWerke GmbH** (rebranded from Fuchs Holding)
- Product: **ThermoHybrid** (name unchanged)
- Image files still use old naming (e.g., `FuchsComfy.png`)
