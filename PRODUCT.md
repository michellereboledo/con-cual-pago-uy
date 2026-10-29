---
schema: impeccable:product-schema 1
product:
  name: "¿Con Cuál Pago? UY"
  codename: "PRISMA UY"
  category: "Consumer Fintech · Real-Time POS Card & Discount Optimizer (Uruguay)"
  version: "2.0.0"
---

# PRODUCT.md — ¿Con Cuál Pago? UY (`impeccable:product-schema 1`)

## 1. Mission Statement
Tell any Uruguayan shopper standing at a physical checkout or paying online **which exact bank card & tier** produces the lowest net ticket in Uruguayan Pesos (`$U`) **right now** — backed by **100% live-verified bank catalog evidence and SHA-256 cryptographic hashes** so a user never relies on an expired or invented promotion.

## 2. Target Audience & Context of Use
- **Primary Context:** One-handed mobile operation at a restaurant table, pharmacy counter, fuel station, or supermarket checkout in Montevideo, Canelones, Maldonado, and across all 19 departments of Uruguay.
- **Environmental Realities:** Mixed indoor harsh POS lighting and outdoor sunlight (`Modo Titanio` `#0B0C0E` for OLED contrast; `Modo Cuarzo` `#EAE5DC` for outdoor daylight legibility).
- **Time Budget:** Under **3 seconds** from app open to knowing the exact card, discount percentage, cap (`tope`), and net `$U` savings.

## 3. Core Capabilities
1. **Zero-Fake Discount Engine (`166/166` Verified Rules Across `84` Merchants):**
   - Every rule links to an official bank portal (`Itaú`, `Santander`, `BROU`, `Scotiabank`, `BBVA`, `OCA`, `Creditel`, `Prex`, `HSBC`) with a captured `evidenceSnippet` and `legalTextHash` (`SHA-256`).
2. **Real-Time Live Edge Probe (`/api/verify-promo`):**
   - Probes the bank's live catalog URL when opening any merchant's POS terminal sheet (`VERIFIED_LIVE`, `MODIFIED_BY_BANK`, or `REMOVED_404`).
3. **Uruguayan Card Tier Ladder (`CARD_TIERS_BY_BANK`):**
   - Separates `Débito`, `Clásica / Volar`, `Gold`, `Platinum`, `Black / Infinite`, and `Personal Bank / Select / Singular` so standard cardholders are never misled by wealth-tier rates.
4. **Ley 19.210 / 17.934 IVA Reduction Stacker:**
   - Automatically calculates the 9 pts IVA reduction in gastronomy when applicable on top of bank discounts.
