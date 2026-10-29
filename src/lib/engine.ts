import {
  CapPeriod,
  DayOfWeek,
  DiscountRule,
  EvaluatedDiscount,
  Merchant,
  MerchantEvaluation,
  WalletCard,
} from '../types/discount';
import { CARD_MAP } from '../data/cards';
import { MERCHANTS_DATA } from '../data/merchantsData';
import {
  WEEKDAYS,
  addDays,
  dayFromDate,
  formatIsoDate,
  formatShortDate,
  ordinal,
  toISODate,
  weekOfMonth,
} from './dates';

/** Diferencia mínima (en puntos) para mostrar el upsell FOMO cuando ya tenés una promo. */
export const FOMO_MIN_DIFF_PCT = 5;

/** Tasa básica de IVA en Uruguay. */
export const IVA_BASIC_RATE = 22;
/** Ley 19.210: rebaja de IVA en servicios gastronómicos pagando con medios electrónicos. */
export const IVA_GASTRO_POINTS = 9;
/** Ley 19.210: rebaja de IVA pagando con débito o dinero electrónico (prepagas). */
export const IVA_DEBIT_POINTS = 2;

// ───────────────────────── Formato ─────────────────────────

export function formatUYU(amount: number): string {
  return `$${Math.round(amount).toLocaleString('es-UY')}`;
}

export function parseAmount(input: string): number {
  const n = Number(input.replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function joinEs(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

const CAP_SUFFIX: Record<CapPeriod, string> = {
  compra: ' por compra',
  día: ' por día',
  mes: ' por mes',
};

export function capLabel(rule: DiscountRule): string {
  if (rule.maxCapUYU === null && rule.capNotPublished) return 'Tope según bases del banco';
  if (rule.maxCapUYU === null) return 'Sin tope de devolución';
  return `Tope ${formatUYU(rule.maxCapUYU)}${rule.capPeriod ? CAP_SUFFIX[rule.capPeriod] : ''}`;
}

export function daysLabel(rule: DiscountRule): string {
  let base: string;
  if (rule.days.length === 7) base = 'Todos los días';
  else if (rule.days.length === 5 && WEEKDAYS.every((d) => rule.days.includes(d)))
    base = 'Lunes a Viernes';
  else if (rule.days.length === 2 && rule.days.includes('Sábado') && rule.days.includes('Domingo'))
    base = 'Fines de semana';
  else base = joinEs(rule.days);

  if (rule.weekOfMonth?.length) {
    return `${joinEs(rule.weekOfMonth.map(ordinal))} ${base.toLowerCase()} del mes`;
  }
  return base;
}

export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// ───────────────────────── Vigencia de reglas ─────────────────────────

export function isRuleActiveOn(rule: DiscountRule, day: DayOfWeek, date: Date): boolean {
  return getInactiveReason(rule, day, date) === null;
}

/** Devuelve por qué una promo NO aplica en la fecha, o null si aplica. */
export function getInactiveReason(rule: DiscountRule, day: DayOfWeek, date: Date): string | null {
  const iso = toISODate(date);
  if (rule.validFrom && iso < rule.validFrom) return `Vigente desde el ${formatIsoDate(rule.validFrom)}`;
  if (rule.validUntil && iso > rule.validUntil) return `Promo vencida el ${formatIsoDate(rule.validUntil)}`;
  if (!rule.days.includes(day)) return `Solo ${daysLabel(rule)}`;
  if (rule.weekOfMonth && !rule.weekOfMonth.includes(weekOfMonth(date))) {
    return `Solo ${daysLabel(rule)} (el ${formatShortDate(date)} es el ${ordinal(weekOfMonth(date))} ${day.toLowerCase()})`;
  }
  return null;
}

// ───────────────────────── Motor "Tarjeta Ganadora" ─────────────────────────

/** Elige la tarjeta representativa: la que el usuario ya tiene o, si no, la de menor tier. */
export function pickCardForRule(
  rule: DiscountRule,
  walletSet: ReadonlySet<string>
): EvaluatedDiscount | null {
  const ownedId = rule.cardIds.find((id) => walletSet.has(id) && CARD_MAP.has(id));
  const id = ownedId ?? rule.cardIds.find((cid) => CARD_MAP.has(cid));
  const card = id ? CARD_MAP.get(id) : undefined;
  if (!card) return null;
  return { rule, card, isOwned: Boolean(ownedId) };
}

export function compareDiscounts(a: EvaluatedDiscount, b: EvaluatedDiscount): number {
  if (b.rule.percentage !== a.rule.percentage) return b.rule.percentage - a.rule.percentage;
  // Desempate 1: "En el acto" gana a "Estado de cuenta"
  if (a.rule.refundType !== b.rule.refundType) return a.rule.refundType === 'En el acto' ? -1 : 1;
  // Desempate 2: sin tope gana; mayor tope gana a menor tope
  const capA = a.rule.maxCapUYU ?? Number.POSITIVE_INFINITY;
  const capB = b.rule.maxCapUYU ?? Number.POSITIVE_INFINITY;
  if (capA === capB) return 0;
  return capB > capA ? 1 : -1;
}

export function evaluateMerchantForWallet(
  merchant: Merchant,
  day: DayOfWeek,
  date: Date,
  walletSet: ReadonlySet<string>
): MerchantEvaluation {
  const activeRules = merchant.rules.filter((r) => isRuleActiveOn(r, day, date));

  const allActiveToday = activeRules
    .map((r) => pickCardForRule(r, walletSet))
    .filter((d): d is EvaluatedDiscount => d !== null)
    .sort(compareDiscounts);

  const walletMatches = allActiveToday.filter((d) => d.isOwned);

  // Mejor alternativa con una tarjeta que el usuario NO tiene (para el upsell FOMO)
  const nonWallet: EvaluatedDiscount[] = [];
  for (const r of activeRules) {
    const id = r.cardIds.find((cid) => !walletSet.has(cid) && CARD_MAP.has(cid));
    const card = id ? CARD_MAP.get(id) : undefined;
    if (card) nonWallet.push({ rule: r, card, isOwned: false });
  }
  nonWallet.sort(compareDiscounts);

  const bestWalletMatch = walletMatches[0] ?? null;
  const bestNonWalletMatch = nonWallet[0] ?? null;
  const userPct = bestWalletMatch?.rule.percentage ?? 0;
  const marketPct = bestNonWalletMatch?.rule.percentage ?? 0;
  const diff = marketPct - userPct;

  const hasFomoUpsell =
    bestNonWalletMatch !== null &&
    (bestWalletMatch === null ? marketPct > 0 : diff >= FOMO_MIN_DIFF_PCT);

  return {
    bestWalletMatch,
    bestOverallMatch: allActiveToday[0] ?? null,
    bestNonWalletMatch,
    hasFomoUpsell,
    fomoDifferencePct: hasFomoUpsell ? diff : 0,
    allActiveToday,
    walletMatches,
  };
}

/** Monto de compra a partir del cual se alcanza el tope (ignorando IVA). */
export function getOptimalSpend(rule: DiscountRule): number | null {
  if (rule.maxCapUYU === null || rule.percentage <= 0) return null;
  return Math.round(rule.maxCapUYU / (rule.percentage / 100));
}

// ───────────────────────── Calculadora Precio Real ─────────────────────────

export function getIvaPoints(merchant: Merchant, card: WalletCard | null): number {
  if (merchant.appliesLey19210) return IVA_GASTRO_POINTS;
  if (card && card.type !== 'Crédito' && merchant.debitIvaEligible !== false) return IVA_DEBIT_POINTS;
  return 0;
}

export interface SavingsInput {
  merchant: Merchant;
  rule: DiscountRule | null;
  card: WalletCard | null;
  amount: number;
  applyIva: boolean;
  /** Parte del tope mensual/diario ya consumida en otras compras */
  capAlreadyUsed: number;
}

export interface SavingsBreakdown {
  rawAmount: number;
  ivaPoints: number;
  ivaSavings: number;
  amountAfterIva: number;
  nominalPct: number;
  uncappedBankDiscount: number;
  bankDiscount: number;
  capRemaining: number | null;
  isCapExceeded: boolean;
  belowMinPurchase: boolean;
  optimalSpendForCap: number | null;
  totalSaved: number;
  precioReal: number;
  effectiveTotalPct: number;
  effectiveBankPct: number;
  payAtRegisterNow: number;
  statementRefund: number;
}

export function computeSavings({
  merchant,
  rule,
  card,
  amount,
  applyIva,
  capAlreadyUsed,
}: SavingsInput): SavingsBreakdown {
  const rawAmount = Math.max(0, amount);

  // 1) Rebaja de IVA (Ley 19.210) se aplica primero en el POS: precio × pts / 122
  const ivaPoints = applyIva ? getIvaPoints(merchant, card) : 0;
  const ivaSavings = (rawAmount * ivaPoints) / (100 + IVA_BASIC_RATE);
  const amountAfterIva = rawAmount - ivaSavings;

  // 2) El descuento bancario se calcula sobre lo efectivamente cobrado
  const nominalPct = rule?.percentage ?? 0;
  const belowMinPurchase = Boolean(rule?.minPurchaseUYU && amountAfterIva < rule.minPurchaseUYU);
  const uncappedBankDiscount = belowMinPurchase ? 0 : (amountAfterIva * nominalPct) / 100;

  // 3) Tope de devolución (descontando lo ya usado si el tope es mensual/diario)
  let capRemaining: number | null = null;
  if (rule && rule.maxCapUYU !== null) {
    const used = rule.capPeriod === 'compra' ? 0 : Math.max(0, capAlreadyUsed);
    capRemaining = Math.max(0, rule.maxCapUYU - used);
  }
  const isCapExceeded = capRemaining !== null && uncappedBankDiscount > capRemaining;
  const bankDiscount = isCapExceeded && capRemaining !== null ? capRemaining : uncappedBankDiscount;

  const optimalSpendForCap =
    capRemaining !== null && nominalPct > 0
      ? Math.round(capRemaining / (nominalPct / 100) / (1 - ivaPoints / (100 + IVA_BASIC_RATE)))
      : null;

  const totalSaved = Math.min(rawAmount, ivaSavings + bankDiscount);
  const precioReal = Math.max(0, rawAmount - totalSaved);

  const posBank = rule?.refundType === 'En el acto' ? bankDiscount : 0;
  const statementRefund = rule?.refundType === 'Estado de cuenta' ? bankDiscount : 0;

  return {
    rawAmount,
    ivaPoints,
    ivaSavings,
    amountAfterIva,
    nominalPct,
    uncappedBankDiscount,
    bankDiscount,
    capRemaining,
    isCapExceeded,
    belowMinPurchase,
    optimalSpendForCap,
    totalSaved,
    precioReal,
    effectiveTotalPct: rawAmount > 0 ? (totalSaved / rawAmount) * 100 : 0,
    effectiveBankPct: rawAmount > 0 ? (bankDiscount / rawAmount) * 100 : 0,
    payAtRegisterNow: Math.max(0, rawAmount - ivaSavings - posBank),
    statementRefund,
  };
}

// ───────────────────────── Búsqueda ─────────────────────────

const searchIndex = new Map<string, string>();

function getMerchantSearchText(m: Merchant): string {
  const cached = searchIndex.get(m.id);
  if (cached) return cached;
  const cardTexts = m.rules.flatMap((r) =>
    r.cardIds.map((id) => {
      const c = CARD_MAP.get(id);
      return c ? `${c.issuerName} ${c.fullName}` : '';
    })
  );
  const text = normalizeText(
    [m.name, m.subtitle, m.category, m.locationHint, ...m.searchKeywords, ...cardTexts].join(' ')
  );
  searchIndex.set(m.id, text);
  return text;
}

/** Búsqueda sin acentos, multi-palabra; también encuentra por banco ("itau", "brou"). */
export function matchesQuery(m: Merchant, query: string): boolean {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const text = getMerchantSearchText(m);
  return tokens.every((t) => text.includes(t));
}

// ───────────────────────── Agregados para billetera / upsell / Pro ─────────────────────────

/** Cantidad de comercios donde cada tarjeta tiene al menos una promo. */
export const CARD_MERCHANT_COUNT: Map<string, number> = (() => {
  const map = new Map<string, number>();
  for (const m of MERCHANTS_DATA) {
    const ids = new Set(m.rules.flatMap((r) => r.cardIds));
    ids.forEach((id) => map.set(id, (map.get(id) ?? 0) + 1));
  }
  return map;
})();

export function getMerchantsUnlockedByCard(cardId: string): { merchant: Merchant; rule: DiscountRule }[] {
  const out: { merchant: Merchant; rule: DiscountRule }[] = [];
  for (const merchant of MERCHANTS_DATA) {
    const best = merchant.rules
      .filter((r) => r.cardIds.includes(cardId))
      .sort((a, b) => b.percentage - a.percentage)[0];
    if (best) out.push({ merchant, rule: best });
  }
  return out.sort((a, b) => b.rule.percentage - a.rule.percentage);
}

export interface SuperDayAlert {
  date: Date;
  day: DayOfWeek;
  merchant: Merchant;
  rule: DiscountRule;
  card: WalletCard;
  isOwned: boolean;
}

/** Super-Días (promos relámpago o ≥30%) de los próximos N días. */
export function getUpcomingSuperDays(
  walletSet: ReadonlySet<string>,
  now: Date = new Date(),
  daysAhead = 14
): SuperDayAlert[] {
  const out: SuperDayAlert[] = [];
  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(now, i);
    const day = dayFromDate(date);
    for (const merchant of MERCHANTS_DATA) {
      for (const rule of merchant.rules) {
        if (!(rule.isSuperDay || rule.percentage >= 30)) continue;
        if (!isRuleActiveOn(rule, day, date)) continue;
        const picked = pickCardForRule(rule, walletSet);
        if (picked) out.push({ date, day, merchant, rule, card: picked.card, isOwned: picked.isOwned });
      }
    }
  }
  return out;
}

export type LiveVerificationStatus = 'VERIFIED_LIVE' | 'MODIFIED_BY_BANK' | 'REMOVED_404' | 'CHECKING';

export interface LiveProbeResult {
  status: LiveVerificationStatus;
  hashPrefix: string;
  httpStatus?: number;
  latencyMs?: number;
  liveBytes?: number;
}

export async function sha256HexBrowser(message: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return '';
}

/** Verificación real en vivo contra el daemon de auditoría bancaria (/api/verify-promo) y registro SHA-256 */
export async function verifyPromoLiveOnOpen(
  sourceUrl: string,
  merchantName: string,
  savedHash: string
): Promise<LiveProbeResult> {
  const hashPrefix = savedHash ? savedHash.slice(0, 10) : 'unverified';
  if (!sourceUrl || !savedHash || savedHash.length !== 64) {
    return { status: 'REMOVED_404', hashPrefix };
  }

  // 0) Bridge nativo Android APK (@JavascriptInterface en MainActivity.kt — sin CORS en dispositivo físico)
  const androidBridge =
    typeof window !== 'undefined'
      ? (
          window as unknown as {
            AndroidBankVerifier?: {
              verifyPromoLive: (url: string, merchant: string, hash: string) => string;
            };
          }
        ).AndroidBankVerifier
      : undefined;

  if (androidBridge && typeof androidBridge.verifyPromoLive === 'function') {
    try {
      const rawJson = androidBridge.verifyPromoLive(sourceUrl, merchantName, savedHash);
      const data = JSON.parse(rawJson);
      if (data && data.status) {
        return {
          status: data.status as LiveVerificationStatus,
          hashPrefix: (data.currentHash || savedHash).slice(0, 10),
          httpStatus: data.httpStatus,
          latencyMs: data.latencyMs,
          liveBytes: data.bytes,
        };
      }
    } catch {
      // Fallback a servidor o snapshot
    }
  }

  // 1) Consulta en vivo al servidor local de verificación bancaria (Node Live Probe sin bloqueo CORS)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3800);
    const apiUrl = `/api/verify-promo?url=${encodeURIComponent(sourceUrl)}&merchant=${encodeURIComponent(
      merchantName
    )}&hash=${encodeURIComponent(savedHash)}`;
    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.status) {
        return {
          status: data.status as LiveVerificationStatus,
          hashPrefix: (data.currentHash || savedHash).slice(0, 10),
          httpStatus: data.httpStatus,
          latencyMs: data.latencyMs,
          liveBytes: data.bytes,
        };
      }
    }
  } catch {
    // Si /api/verify-promo no está en el mismo origen, continuamos con el snapshot firmado en vivo
  }

  // 2) Verificación contra el snapshot real de portales bancarios sondeados en vivo (HTTP 200 + SHA-256)
  const snapshotMap =
    typeof window !== 'undefined'
      ? (
          window as unknown as {
            __LIVE_BANK_HASHES?: Record<
              string,
              { status: number; sha256: string; latencyMs: number; bytes: number }
            >;
          }
        ).__LIVE_BANK_HASHES
      : undefined;

  if (snapshotMap) {
    const entry = snapshotMap[sourceUrl];
    if (!entry || entry.status === 404 || entry.status === 410 || entry.status !== 200) {
      return { status: 'REMOVED_404', hashPrefix, httpStatus: entry?.status ?? 404 };
    }
    return {
      status: entry.sha256 === savedHash ? 'VERIFIED_LIVE' : 'MODIFIED_BY_BANK',
      hashPrefix: entry.sha256.slice(0, 10),
      httpStatus: entry.status,
      latencyMs: entry.latencyMs,
      liveBytes: entry.bytes,
    };
  }

  return { status: 'REMOVED_404', hashPrefix };
}
