# SPEC.md — Technical Specification (`addyosmani/agent-skills`)

## 1. System Architecture
- **Frontend Application (`src/`):** React 18 + TypeScript + Tailwind CSS + GSAP 3.12.5 (`src/hooks/useGsapChoreography.ts`), compiled into a zero-external-dependency single-file bundle (`index.html`, `preview.html`, and `android-app/app/src/main/assets/index.html`) via `scripts/build-preview.cjs`.
- **Zero-Fake Evidence Engine (`scripts/build-verified-data.cjs` & `scripts/audit-discounts.cjs`):**
  - Audits all 84 merchants and 166 discount rules against captured official bank portal HTML snapshots (`public/live-bank-hashes.json`) and generates `public/discount-audit.json`.
- **Live Bank Verification Daemon (`scripts/live-bank-verifier-server.cjs`):**
  - Serves the app on `http://127.0.0.1:4173` and exposes `GET /api/verify-promo?url=...&merchant=...&hash=...` and `GET /api/audit-status`.
- **Codebase Knowledge Graph (`scripts/graphify-ast.cjs`):**
  - Deterministic AST extractor generating `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`, and `public/graph.json`.

## 2. Core Data Contracts
- **`DiscountRule` (`src/data/merchantsData.ts`):**
  - `bank`: Official Uruguayan issuer (`itau`, `santander`, `brou`, `scotiabank`, `bbva`, `oca`, `creditel`, `prex`, `hsbc`).
  - `cardTier`: Required tier (`debito`, `clasica`, `gold`, `platinum`, `black`, `personal_bank`).
  - `discount`: Verified integer percentage (`5` to `50`).
  - `days`: Valid days of the week (`lun`..`dom` or `todos`).
  - `sourceUrl`: Official `https://` bank portal URL.
  - `evidenceSnippet`: Exact text excerpt from the bank catalog.
  - `legalTextHash`: 64-character hex SHA-256 digest of the official bank response.
