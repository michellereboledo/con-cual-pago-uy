---
name: "PRISMA UY — Tactile Financial Instrument Design System"
schema: "impeccable:design-system 1"
domain: "Consumer Fintech / POS Card Optimizer (Uruguay)"
defaultTheme: "titanium-dark"
secondaryTheme: "quartz-light"
---

# DESIGN.md — PRISMA UY Design System (`pbakaus/impeccable` + `transitions.dev` + `make-interfaces-feel-better`)

## 1. Aesthetic Direction & Anti-Slop Mandate
- **Persona:** Tactile Financial Instrument (`PRISMA UY`). Inspired by Teenage Engineering hardware dials, Apple Wallet ISO-7810 physical cards, and Stripe Press tabular precision.
- **Strict Anti-Patterns:**
  - Zero decorative emojis in any UI component.
  - Zero `transition-all` or `transition: all` declarations anywhere in CSS or JSX.
  - Zero unverified or generic placeholder discounts.

## 2. Color Tokens
| Token | Titanium Dark (`:root`) | Quartz Light (`html.theme-light`) | Usage |
| :--- | :--- | :--- | :--- |
| `--bg-void` | `#0B0C0E` | `#EAE5DC` | Primary canvas background |
| `--bg-glass` | `rgba(21, 24, 30, 0.72)` | `rgba(255, 253, 249, 0.94)` | Elevated instrument surfaces |
| `--accent-volt` | `#D4FF33` | `#155E2B` | Primary savings / best card signal |
| `--accent-emerald` | `#10B981` | `#047857` | Cryptographic `VERIFIED_LIVE` status |
| `--ink-primary` | `#F4F6F8` | `#0F141C` | Primary headline and ticket numerals |
| `--ink-secondary` | `#94A3B8` | `#334155` | Supporting metadata and caps |
| `--ink-muted` | `#64748B` | `#475569` | Labels and SHA-256 short hashes |

## 3. 4-Voice Typography & Numeric Discipline
- **Display (`--font-display` — `Instrument Serif`):** Editorial headlines with `text-wrap: balance`.
- **Sans (`--font-sans` — `Plus Jakarta Sans`):** High-legibility UI labels and legal conditions with `text-wrap: pretty`.
- **Mono (`--font-mono` — `JetBrains Mono`):** Card numbers, SHA-256 hashes, caps (`TOPE`), and live `$U` ticket math with `font-variant-numeric: tabular-nums`.
- **Font Smoothing:** `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale` on `html`.

## 4. Spatial Architecture & Concentric Geometry
- **Concentric Border Radius Formula:** $R_{\text{outer}} = R_{\text{inner}} + \text{padding}$.
  - Bottom sheets / modals: `rounded-[28px]` (`28px`) with `p-4` (`16px`) $\rightarrow$ inner cards `rounded-2xl` (`16px`) / `rounded-xl` (`12px`).
  - 7-Day Tactile Dial: outer container `rounded-2xl` (`16px`) + `p-1` (`4px`) $\rightarrow$ inner day buttons `rounded-xl` (`12px`).
- **Perforated Passes (`.perforated-pass` + `.pass-CheckStub`):** Physical ticket notch cutouts (`18px` diameter radial circles) separating merchant details from the right-hand discount stub.

## 5. Motion Tokens (`transitions.dev`)
- **Durations:**
  - `--duration-stagger: 40ms`
  - `--duration-instant: 150ms`
  - `--duration-fast: 250ms`
  - `--duration-medium: 300ms`
  - `--duration-slow: 400ms`
  - `--duration-very-slow: 500ms`
- **Easing Curves:**
  - `--ease-smooth-out: cubic-bezier(0.22, 1, 0.36, 1)`
  - `--ease-spring-out: cubic-bezier(0.16, 1, 0.3, 1)`
  - `--ease-icon-swap: cubic-bezier(0.2, 0, 0, 1)`

## 6. Interactive Ergonomics (`make-interfaces-feel-better`)
- **Touch Target Expansion (`.hit-target-44`):** Every compact icon button expands its hit region to at least `44x44px` via `::after` pseudo-element.
- **Tactile Press Feedback (`.t-press`):** Active press scales to `0.96` (`var(--scale-press)`) using explicit `transform` transition.
- **Dual-Slot Icon Swap (`.t-icon-swap` / `.t-icon-swap-item`):** Cross-fades stateful icons (`★` $\leftrightarrow$ `☆`, `☀` $\leftrightarrow$ `◐`, `⎘` $\leftrightarrow$ `✓`) with `scale(0.25) -> 1`, `blur(4px) -> 0`, and `opacity: 0 -> 1`.

## 7. GSAP Choreography (`greensock/gsap`)
- **3D ISO-7810 Card Fan (`useGsapCardFan`):** Spring entrance and wallet-filter reflow choreography guarded by `gsap.matchMedia()`.
- **Real-Time `$U` Ticket Counter (`useAnimatedUYU`):** Smoothly tweens `precioReal` and `totalSaved` numerals at 60fps without layout shift.

## 8. Accessibility & Media Guards
- Hover states (`@media (hover: hover) and (pointer: fine)`) never stick on mobile touchscreens.
- Reduced motion (`@media (prefers-reduced-motion: reduce)`) collapses all CSS and GSAP animations to instant state updates.
