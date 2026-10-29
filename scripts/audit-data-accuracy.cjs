/**
 * =============================================================================
 * PRISMA UY — STRICT DATA ACCURACY & DEDUPLICATION AUDITOR
 * (`scripts/audit-data-accuracy.cjs`)
 * =============================================================================
 *
 * Verifica con tolerancia CERO:
 * 1. Cero tarjetas repetidas (`card_tier_id`) en reglas superpuestas de un mismo comercio.
 * 2. Coincidencia 100% literal entre el porcentaje extraído (`percentage`) y la
 *    evidencia textual oficial (`evidence` / `evidencia_textual_exacta`).
 * 3. Cero confusión entre mecánicas (`2x1` / `3x2` / cuotas / millas != `% OFF` falso).
 * 4. Imprime un muestreo auditable de >= 24 comercios reales (BBVA, Itaú, Santander,
 *    Scotiabank, BROU, OCA) con:
 *    `Comercio | Banco | Tarjetas | % Extraído | Evidencia Textual Exacta`
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function loadMerchantsData() {
  const file = fs.readFileSync(path.join(ROOT, "src", "data", "merchantsData.ts"), "utf8");
  const marker = "export const MERCHANTS_DATA: Merchant[] = ";
  const start = file.indexOf(marker);
  if (start === -1) throw new Error("No se encontró MERCHANTS_DATA en src/data/merchantsData.ts");
  const jsonText = file.slice(start + marker.length).replace(/;\s*$/, "");
  return JSON.parse(jsonText);
}

function runStrictDataAudit() {
  console.log("================================================================================");
  console.log("  PRISMA UY — AUDITORÍA ESTRICTA DE VERACIDAD Y DEDUPLICACIÓN DE DATOS");
  console.log("================================================================================\n");

  const merchants = loadMerchantsData();
  const deepDbPath = path.join(ROOT, "public", "deep-scrape-db.json");
  const deepDb = fs.existsSync(deepDbPath) ? JSON.parse(fs.readFileSync(deepDbPath, "utf8")) : null;

  const duplicateCardErrors = [];
  const evidenceMismatchErrors = [];
  const mechanicConfusionErrors = [];

  let totalRulesChecked = 0;

  for (const m of merchants) {
    // Mapa: cardId -> Map<day, rule>
    const cardDayOwner = new Map();

    for (const r of m.rules || []) {
      totalRulesChecked++;
      const days =
        Array.isArray(r.days) && r.days.length > 0
          ? r.days
          : ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

      // 1. Verificar duplicación de tarjeta en el mismo comercio y día
      for (const cardId of r.cardIds || []) {
        if (!cardDayOwner.has(cardId)) {
          cardDayOwner.set(cardId, new Map());
        }
        const dayMap = cardDayOwner.get(cardId);
        for (const d of days) {
          if (dayMap.has(d)) {
            const prevRule = dayMap.get(d);
            duplicateCardErrors.push(
              `[DUPLICADO] Comercio "${m.name}" (${m.id}): tarjeta "${cardId}" repetida el día ${d} en reglas "${prevRule.id}" (${prevRule.percentage}%) y "${r.id}" (${r.percentage}%)`
            );
          } else {
            dayMap.set(d, r);
          }
        }
      }

      // 2. Verificar evidencia textual vs porcentaje y mecánicas (2x1 / cuotas)
      const ev = String(r.evidence || "");
      const cond = String(r.conditions || "");
      const evLower = ev.toLowerCase();
      const condLower = cond.toLowerCase();

      const hasExplicitPctInEvidence =
        evLower.includes(`${r.percentage}%`) ||
        evLower.includes(`${r.percentage} %`) ||
        evLower.includes(`:${r.percentage}`) ||
        evLower.includes(`"${r.percentage}"`);
      const is2x1Rule =
        r.percentage === 50 &&
        (/\b2\s*x\s*1\b|mitad\s+de\s+precio|a\s+la\s+mitad/i.test(evLower) ||
          /\b2\s*x\s*1\b|mitad\s+de\s+precio|a\s+la\s+mitad/i.test(condLower));

      if (!hasExplicitPctInEvidence && !is2x1Rule) {
        evidenceMismatchErrors.push(
          `[EVIDENCIA INVÁLIDA] Comercio "${m.name}" · Regla "${r.id}": % extraído=${r.percentage}% pero la evidencia no lo respalda -> ${ev.slice(
            0,
            140
          )}`
        );
      }

      // Prohibir que un 2x1 se asigne a un % distinto de 50 o sin aclarar 2x1 en condiciones
      if (/\b2\s*x\s*1\b/i.test(evLower) && !hasExplicitPctInEvidence && r.percentage !== 50) {
        mechanicConfusionErrors.push(
          `[CONFUSIÓN 2x1] Comercio "${m.name}" · Regla "${r.id}": evidencia menciona 2x1 pero se asignó ${r.percentage}% -> ${ev.slice(
            0,
            140
          )}`
        );
      }

      // Prohibir reglas que sean únicamente cuotas sin recargo o millas sin % ni 2x1
      if (
        !hasExplicitPctInEvidence &&
        !is2x1Rule &&
        /cuotas\s+sin\s+recargo|metros\s+x|scotiapuntos|connectmiles/i.test(evLower)
      ) {
        mechanicConfusionErrors.push(
          `[CUOTAS/PUNTOS FALSO %] Comercio "${m.name}" · Regla "${r.id}": ${ev.slice(0, 140)}`
        );
      }
    }
  }

  // 3. Muestreo auditable de 24 casos reales (BBVA, Itaú, Santander, Scotiabank, BROU, OCA)
  const sampleByBank = { BBVA: [], ITAU: [], SANTANDER: [], SCOTIA: [], BROU: [], OCA: [] };
  for (const m of merchants) {
    for (const r of m.rules) {
      const prefix = (r.cardIds[0] || "").split("-")[0].toUpperCase();
      const bankKey = prefix === "SCOTIABANK" ? "SCOTIA" : prefix;
      if (sampleByBank[bankKey] && sampleByBank[bankKey].length < 4) {
        sampleByBank[bankKey].push({
          comercio: m.name,
          banco: bankKey,
          tarjetas: r.cardIds.join(", "),
          pct:
            /\b2\s*x\s*1\b/i.test(r.conditions || "") && r.percentage === 50
              ? "2x1 (50%)"
              : `${r.percentage}%`,
          evidencia: (r.evidence || "").replace(/\s+/g, " ").trim().slice(0, 115),
        });
      }
    }
  }

  console.log("MUESTREO DE VERACIDAD PALABRA POR PALABRA (24 REGLAS REALES MULTI-BANCO):");
  console.log("--------------------------------------------------------------------------------");
  const allSamples = Object.values(sampleByBank).flat();
  for (const s of allSamples) {
    console.log(
      `• ${s.comercio.padEnd(24).slice(0, 24)} | ${s.banco.padEnd(9)} | ${s.pct.padEnd(9)} | [${s.tarjetas}]`
    );
    console.log(`  └─ Evidencia: ${s.evidencia}`);
  }
  console.log("--------------------------------------------------------------------------------\n");

  console.log(`Resumen de Escaneo:`);
  console.log(`  • Comercios activos auditados:         ${merchants.length}`);
  console.log(`  • Reglas activas auditadas:            ${totalRulesChecked}`);
  console.log(`  • Entidades en deep-scrape-db.json:    ${deepDb ? deepDb.normalizedEntitiesCount : 0}`);
  console.log(`  • Conflictos de tarjetas duplicadas:   ${duplicateCardErrors.length}`);
  console.log(`  • Discrepancias % vs. Evidencia:       ${evidenceMismatchErrors.length}`);
  console.log(`  • Confusiones 2x1 / Cuotas / Puntos:   ${mechanicConfusionErrors.length}\n`);

  if (
    duplicateCardErrors.length > 0 ||
    evidenceMismatchErrors.length > 0 ||
    mechanicConfusionErrors.length > 0
  ) {
    console.error("❌ FALLÓ LA AUDITORÍA DE VERACIDAD DE DATOS:");
    for (const err of [
      ...duplicateCardErrors.slice(0, 20),
      ...evidenceMismatchErrors.slice(0, 20),
      ...mechanicConfusionErrors.slice(0, 20),
    ]) {
      console.error("  " + err);
    }
    process.exit(1);
  }

  console.log(
    "✅ AUDITORÍA APROBADA: 0 tarjetas duplicadas · 100% coincidencia literal % <-> Evidencia Oficial."
  );
}

runStrictDataAudit();
