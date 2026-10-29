# AGENTS.md — Multi-Agent & Skill Architecture (`addyosmani/agent-skills` + `Graphify-Labs/graphify`)

## Graph-First Codebase Orientation (`Graphify-Labs/graphify`)
Before searching raw files across the repository, inspect:
- [`graphify-out/GRAPH_REPORT.md`](file:///c:/Users/m.reboledo/Documents/antigravity/radiant-goodall/graphify-out/GRAPH_REPORT.md): God nodes, community clusters, and structural hubs.
- [`graphify-out/graph.json`](file:///c:/Users/m.reboledo/Documents/antigravity/radiant-goodall/graphify-out/graph.json): Deterministic AST knowledge graph with `EXTRACTED` (1.0 confidence) and `INFERRED` relationships.

## Lifecycle Workflow (`addyosmani/agent-skills`)
1. **Spec (`SPEC.md` & `PRODUCT.md`):** Validate every feature against the product mission (instant POS card optimizer for Uruguay with zero fake discounts).
2. **Design (`DESIGN.md`):** Enforce the **PRISMA UY** aesthetic system (`#0B0C0E` Obsidian Titanium, `#D4FF33` Acid Volt, `#EAE5DC` Warm Quartz, 4-voice typography, zero emojis, ISO-7810 3D cards, and perforated `.pass-CheckStub` passes).
3. **Motion & Ergonomics (`transitions.dev` + `make-interfaces-feel-better` + `GSAP`):**
   - Never use `transition-all` or `transition: all`.
   - Use `:root` CSS motion tokens (`--duration-fast`, `--ease-smooth-out`, `--ease-icon-swap`).
   - Use `.hit-target-44` on compact interactive controls, `.t-press` (`scale(0.96)`) on pressables, `.t-icon-swap` (`scale(0.25) -> 1` + `blur(4px) -> 0`) on stateful icons, and `tabular-nums` on all financial numbers.
   - Use GSAP (`src/hooks/useGsapChoreography.ts`) with `gsap.matchMedia()` for 3D card fan physics and real-time `$U` counter tweening.
4. **Verify (`CONSTRAINTS.md`):** Run `node scripts/ponytail-audit.cjs` and `node scripts/audit-discounts.cjs` before shipping.
