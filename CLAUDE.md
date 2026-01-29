# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WärmeWerke is a static marketing website for ThermoHybrid energy systems (KWK/Kraft-Wärme-Kopplung). No build process required - plain HTML/CSS/JS served directly.

**Domain:** waermewerke.de
**Language:** German (de)

## Development

**Local preview:** Open any HTML file directly in browser, or use a simple HTTP server:
```bash
python3 -m http.server 8000
# or
npx serve .
```

**No build/lint/test commands** - this is a static site without tooling.

## Architecture

### Pages (HTML)
- `index.html` - Homepage with hero, product showcase, funnel, FAQ
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
| `script.js` | Main bundle: navigation, inline funnel, gallery, FAQ accordion, parallax, reveal animations, analytics, idle prefetch |
| `calculator.js` | BHKW economics calculator - lazy loaded on wirtschaftlichkeit.html |
| `blog.js` | Blog reader with Supabase fetch, DOMPurify sanitization, filtering, deep-links |
| `funnel.js` | Standalone funnel logic (similar to inline funnel in script.js) |
| `admin.js` | Blog admin portal with Supabase auth |

### CSS Design System (`style.css`)
All variables prefixed with `--ww-*`:
- **Primary:** `--ww-primary` (#8B5CF6 violet)
- **Secondary:** `--ww-secondary` (#06B6D4 cyan)
- **Accent:** `--ww-accent` (#EC4899 pink)
- **Fonts:** Poppins (display), Inter (body)
- **Dark theme:** `--ww-dark`, `--ww-darker`, `--ww-card`

### External Services
- **Forms:** FormSubmit.co (action URLs point to info@waermewerke.de)
- **Blog Backend:** Supabase (table: `posts`)
- **Analytics:** Google Analytics placeholder (currently disabled in `initAnalytics()`)

## Key Patterns

### Funnel System
The lead funnel uses `data-*` attributes for state management:
- `data-funnel` - Container
- `data-step-id` - Step identifier
- `data-funnel-form` - Final form
- `data-progress-fill` - Progress bar

### Gallery
Scroll-triggered gallery with intersection observer:
- `#gallery-track` contains `.gallery-item` elements
- `#gallery-headings` syncs with scroll position

### Calculator
BHKW unit selection based on thermal load (`bhkwEinheiten` array in calculator.js).
Formula: `heizlast = verbrauch / 3000`

## Branding Notes
- Company: **WärmeWerke GmbH** (rebranded from Fuchs Holding)
- Product: **ThermoHybrid** (name unchanged)
- Image files still use old naming (e.g., `FuchsComfy.png`)
