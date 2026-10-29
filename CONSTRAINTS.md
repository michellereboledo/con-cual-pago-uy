# CONSTRAINTS.md — Non-Negotiable Quality Gates (`addyosmani/agent-skills` + `dietrichgebert/ponytail`)

Every build MUST satisfy all 8 invariants below (verified automatically by `node scripts/ponytail-audit.cjs`):

1. **Zero-Fake Discounts Invariant:** `166/166` rules across `84` merchants in `src/data/merchantsData.ts` must have `verified === true`, a valid `https://` official bank `sourceUrl`, a non-empty `evidenceSnippet`, and a 64-char SHA-256 `legalTextHash`.
2. **Zero `transition-all` Invariant:** Neither `transition-all` nor `transition: all` may appear anywhere in `src/`.
3. **Motion Tokens Invariant (`transitions.dev`):** `src/index.css` must define `--duration-fast`, `--duration-normal`, `--ease-smooth-out`, `--ease-icon-swap`, and `@media (prefers-reduced-motion: reduce)`.
4. **Ergonomic Polish Invariant (`make-interfaces-feel-better`):** `src/` must implement `.hit-target-44`, `.t-press`, `.t-icon-swap`, `tabular-nums`, `text-wrap: balance`, `text-wrap: pretty`, `-webkit-font-smoothing: antialiased`, and `@media (hover: hover) and (pointer: fine)`.
5. **GSAP Choreography Invariant (`greensock/gsap`):** `src/hooks/useGsapChoreography.ts` must use `gsap.matchMedia()` and reduced-motion guards, and `window.gsap` must be bundled into `index.html`.
6. **Impeccable Design System Invariant (`pbakaus/impeccable`):** `PRODUCT.md` (`impeccable:product-schema 1`) and `DESIGN.md` (`impeccable:design-system 1`) must exist and stay synchronized with `src/index.css`.
7. **Graphify AST Knowledge Graph Invariant (`Graphify-Labs/graphify`):** `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` must be generated and up-to-date.
8. **Ponytail Governance & Debt Ledger Invariant (`dietrichgebert/ponytail` + `andrej-karpathy-skills`):** `CLAUDE.md`, `AGENTS.md`, `SPEC.md`, and `CONSTRAINTS.md` must exist, and all `// shortcut:` markers must be inventoried in `public/engineering-audit.json`.
