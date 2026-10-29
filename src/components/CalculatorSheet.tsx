import { useEffect, useMemo, useState } from 'react';
import { Sheet } from './Sheet';
import { DayOfWeek, Merchant, WalletCard } from '../types/discount';
import { BANK_SKIN_CLASS } from './MerchantCard';
import {
  IVA_DEBIT_POINTS,
  IVA_GASTRO_POINTS,
  LiveProbeResult,
  capLabel,
  computeSavings,
  daysLabel,
  formatUYU,
  getInactiveReason,
  getIvaPoints,
  parseAmount,
  pickCardForRule,
  verifyPromoLiveOnOpen,
} from '../lib/engine';
import { formatShortDate } from '../lib/dates';
import { useAnimatedUYU } from '../hooks/useGsapChoreography';
import { MerchantLogo } from './MerchantLogo';

interface CalculatorSheetProps {
  merchant: Merchant;
  selectedDay: DayOfWeek;
  selectedDate: Date;
  walletSet: ReadonlySet<string>;
  defaultRuleId?: string;
  initialAmount: number;
  onAmountChange: (amount: number) => void;
  onClose: () => void;
  onUpsell: (card: WalletCard) => void;
}

const PRESETS = [800, 1600, 3000, 5000];

export function CalculatorSheet({
  merchant,
  selectedDay,
  selectedDate,
  walletSet,
  defaultRuleId,
  initialAmount,
  onAmountChange,
  onClose,
  onUpsell,
}: CalculatorSheetProps) {
  const [amount, setAmount] = useState<number>(initialAmount);
  const [applyIva, setApplyIva] = useState(true);
  const [capUsedInput, setCapUsedInput] = useState('');
  const [selectedRuleId, setSelectedRuleId] = useState(defaultRuleId ?? '');
  const [copied, setCopied] = useState(false);

  const capUsed = parseAmount(capUsedInput);

  const handleAmountUpdate = (val: number) => {
    const clamped = Math.max(0, Math.min(250000, val));
    setAmount(clamped);
    onAmountChange(clamped);
  };

  const options = useMemo(
    () =>
      merchant.rules
        .flatMap((rule) => {
          const picked = pickCardForRule(rule, walletSet);
          if (!picked) return [];
          const inactiveReason = getInactiveReason(rule, selectedDay, selectedDate);
          const savings = computeSavings({
            merchant,
            rule,
            card: picked.card,
            amount,
            applyIva,
            capAlreadyUsed: 0,
          });
          return [{ ...picked, active: inactiveReason === null, inactiveReason, savings }];
        })
        .sort(
          (a, b) =>
            Number(b.active) - Number(a.active) ||
            Number(b.isOwned) - Number(a.isOwned) ||
            b.savings.totalSaved - a.savings.totalSaved
        ),
    [merchant, walletSet, selectedDay, selectedDate, amount, applyIva]
  );

  const bestOwned = options
    .filter((o) => o.active && o.isOwned)
    .sort((a, b) => b.savings.totalSaved - a.savings.totalSaved)[0];
  const bestMarket = options
    .filter((o) => o.active && !o.isOwned)
    .sort((a, b) => b.savings.totalSaved - a.savings.totalSaved)[0];
  const marketBeatsYou =
    bestMarket !== undefined &&
    (!bestOwned || bestMarket.savings.totalSaved > bestOwned.savings.totalSaved + 1);

  const selected =
    options.find((o) => o.rule.id === selectedRuleId) ??
    bestOwned ??
    options.find((o) => o.active) ??
    options[0];

  const breakdown = selected
    ? computeSavings({
        merchant,
        rule: selected.rule,
        card: selected.card,
        amount,
        applyIva,
        capAlreadyUsed: capUsed,
      })
    : null;

  const animatedPrecioReal = useAnimatedUYU(breakdown?.precioReal ?? amount);
  const animatedTotalSaved = useAnimatedUYU(breakdown?.totalSaved ?? 0);

  const possibleIvaPoints = selected ? getIvaPoints(merchant, selected.card) : 0;
  const showCapUsed = Boolean(
    selected && selected.rule.maxCapUYU !== null && selected.rule.capPeriod !== 'compra'
  );

  const [probeState, setProbeState] = useState<LiveProbeResult>({
    status: 'CHECKING',
    hashPrefix: selected?.rule.legalTextHash?.slice(0, 10) ?? 'sha256',
  });

  useEffect(() => {
    if (!selected?.rule.sourceCatalogUrl || !selected.rule.legalTextHash) return;
    let active = true;
    setProbeState({
      status: 'CHECKING',
      hashPrefix: selected.rule.legalTextHash.slice(0, 10),
    });
    verifyPromoLiveOnOpen(
      selected.rule.sourceCatalogUrl,
      merchant.name,
      selected.rule.legalTextHash
    ).then((res) => {
      if (active) setProbeState(res);
    });
    return () => {
      active = false;
    };
  }, [selected?.rule.id, selected?.rule.sourceCatalogUrl, selected?.rule.legalTextHash, merchant.name]);

  const handleShare = async () => {
    if (!selected || !breakdown) return;
    const text =
      `¿Con Cuál Pago? UY · ${merchant.name} (${selectedDay}): pagá con ${selected.card.fullName} → ` +
      `${selected.rule.percentage}% OFF (${selected.rule.refundType}). ` +
      `En un ticket de ${formatUYU(breakdown.rawAmount)} terminás pagando ${formatUYU(breakdown.precioReal)} ` +
      `(ahorro neto ${formatUYU(breakdown.totalSaved)}).`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: '¿Con Cuál Pago? UY', text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // cancelado
    }
  };

  return (
    <Sheet onClose={onClose} ariaLabel={`Simulador de caja ${merchant.name}`}>
      {/* HEADER CON LOGO DEL COMERCIO */}
      <div className="p-5 sm:p-6 pb-4 border-b border-white/10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <MerchantLogo
            merchantId={merchant.id}
            merchantName={merchant.name}
            category={merchant.category}
            size="lg"
          />
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-[#D4FF33] block tabular-nums">
              {merchant.category} · {selectedDay} {formatShortDate(selectedDate)}
            </span>
            <h3 className="font-display font-bold text-lg sm:text-xl mt-0.5 truncate">{merchant.name}</h3>
            <p className="text-xs opacity-70 truncate">{merchant.locationHint}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleShare}
            className="hit-target-44 t-press px-3.5 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center gap-1.5 text-xs font-semibold"
          >
            <span className="t-icon-swap w-3.5 h-3.5">
              <span className="t-icon-swap-item" data-active={copied ? 'true' : 'false'} aria-hidden="true">
                ✓
              </span>
              <span className="t-icon-swap-item" data-active={copied ? 'false' : 'true'} aria-hidden="true">
                ↗
              </span>
            </span>
            <span>{copied ? 'Copiado' : 'Compartir'}</span>
          </button>
          <button
            onClick={onClose}
            className="hit-target-44 t-press w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-mono text-xs"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* CUERPO ESCROLEABLE */}
      <div className="p-5 sm:p-6 pt-4 overflow-y-auto space-y-4 flex-1">
        {/* RESPUESTA PRINCIPAL + SLIDER DE MONTO (CONCENTRIC RADIUS: 16px outer -> 12px inner) */}
        <div className="p-4 rounded-2xl bg-black/35 border border-white/10 space-y-3.5">
          {/* VEREDICTO INMEDIATO ARRIBA DE TODO */}
          {breakdown && selected && (
            <div className="pb-3.5 border-b border-dashed border-white/20 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono text-[10px] uppercase text-[#D4FF33] block">
                    PAGÁ CON ESTA TARJETA
                  </span>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-md ${BANK_SKIN_CLASS[selected.card.issuerId]} font-mono font-bold text-[10px] uppercase tracking-wider shrink-0`}
                    >
                      {selected.card.issuerName}
                    </span>
                    <span className="font-display font-bold text-sm sm:text-base leading-tight">
                      {selected.card.fullName}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-[10px] uppercase opacity-65 block">
                    COSTO REAL FINAL
                  </span>
                  <span className="font-display font-bold text-2xl sm:text-3xl tabular-nums block leading-none mt-0.5">
                    {formatUYU(animatedPrecioReal)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="font-sans text-xs text-[#2EE59D] font-medium tabular-nums">
                  {breakdown.statementRefund > 0
                    ? `En caja abonás ${formatUYU(breakdown.payAtRegisterNow)} · Te reintegran ${formatUYU(
                        breakdown.statementRefund
                      )} en estado de cuenta`
                    : `Descuento en el acto en el POS: hoy abonás ${formatUYU(breakdown.payAtRegisterNow)}`}
                </span>
                <div className="px-2.5 py-1 rounded-lg bg-[#D4FF33] text-[#0B0C0E] font-mono font-bold text-xs tabular-nums shrink-0">
                  AHORRÁS {formatUYU(animatedTotalSaved)}
                </div>
              </div>
            </div>
          )}

          {/* SELECTOR DE MONTO */}
          <div className="flex justify-between items-baseline gap-2">
            <label htmlFor="pos-ticket-input" className="font-mono text-xs opacity-80">
              MONTO DEL TICKET EN CAJA
            </label>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-sm text-[#D4FF33]">$U</span>
              <input
                id="pos-ticket-input"
                type="text"
                inputMode="numeric"
                value={amount ? amount.toLocaleString('es-UY') : ''}
                onChange={(e) =>
                  handleAmountUpdate(Number(e.target.value.replace(/[^\d]/g, '').slice(0, 7)))
                }
                className="w-28 bg-transparent text-right font-display font-bold text-2xl text-[#D4FF33] tabular-nums focus:outline-none border-b border-white/20 focus:border-[#D4FF33]"
              />
            </div>
          </div>

          <input
            type="range"
            min="400"
            max="8000"
            step="200"
            value={Math.min(8000, Math.max(400, amount))}
            onChange={(e) => handleAmountUpdate(Number(e.target.value))}
            className="pos-slider"
          />

          <div className="grid grid-cols-4 gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => handleAmountUpdate(preset)}
                className={`t-press py-2 rounded-xl font-mono text-xs tabular-nums border ${
                  amount === preset
                    ? 'border-[#D4FF33]/50 bg-[#D4FF33]/15 text-[#D4FF33] font-bold'
                    : 'border-white/10 bg-white/[0.04] hover:border-[#D4FF33]/40'
                }`}
              >
                {formatUYU(preset)}
              </button>
            ))}
          </div>

          {/* DESGLOSE FISCAL Y BANCARIO EN 2 CAJAS CLARAS (SIN SALTO DE LÍNEA ROTO) */}
          {breakdown && selected && (
            <>
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[10px] uppercase opacity-65 tabular-nums">
                      BANCO ({selected.rule.percentage}%)
                    </span>
                    <span className="font-mono text-[10px] text-[#D4FF33] font-bold tabular-nums">
                      {breakdown.effectiveBankPct.toFixed(0)}% real
                    </span>
                  </div>
                  <span className="font-display font-bold text-lg text-[#D4FF33] tabular-nums block mt-0.5">
                    -{formatUYU(breakdown.bankDiscount)}
                  </span>
                  <span className="font-mono text-[10px] opacity-75 block mt-0.5 tabular-nums truncate">
                    {breakdown.isCapExceeded
                      ? `Tope saturado (${formatUYU(selected.rule.maxCapUYU ?? 0)})`
                      : capLabel(selected.rule)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <span className="font-mono text-[10px] uppercase opacity-65 block">
                    LEY 19.210 (IVA)
                  </span>
                  <span className="font-display font-bold text-lg text-[#2EE59D] tabular-nums block mt-0.5">
                    -{formatUYU(breakdown.ivaSavings)}
                  </span>
                  <span className="font-mono text-[10px] opacity-75 block mt-0.5 tabular-nums truncate">
                    {breakdown.ivaPoints > 0
                      ? `-${breakdown.ivaPoints} pts IVA en POS`
                      : 'No aplica en este rubro'}
                  </span>
                </div>
              </div>

              {selected.rule.conditions && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs leading-relaxed">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#D4FF33] font-bold block mb-0.5">
                    CONDICIÓN OFICIAL DEL BANCO
                  </span>
                  <p className="opacity-85">{selected.rule.conditions}</p>
                </div>
              )}

              {/* ZERO-FAKE DISCOUNTS ENGINE: SONDA EN VIVO + SHA-256 + FUENTE BANCARIA */}
              <div className="pt-2 border-t border-white/10 space-y-2 font-mono text-[10px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      data-testid="live-probe-badge"
                      className={`px-2 py-0.5 rounded-md font-bold tabular-nums ${
                        probeState.status === 'REMOVED_404'
                          ? 'bg-[#FF5A36]/20 text-[#FF5A36] border border-[#FF5A36]/40'
                          : 'bg-[#2EE59D]/15 text-[#2EE59D] border border-[#2EE59D]/30'
                      }`}
                    >
                      {probeState.status === 'CHECKING'
                        ? '● VERIFICANDO CATÁLOGO BANCARIO...'
                        : probeState.status === 'VERIFIED_LIVE'
                          ? `✓ VERIFICADO EN VIVO · HTTP ${probeState.httpStatus ?? 200}${
                              probeState.latencyMs ? ` (${probeState.latencyMs}ms)` : ''
                            } · SHA-256`
                          : probeState.status === 'MODIFIED_BY_BANK'
                            ? `● CATÁLOGO ACTUALIZADO · HTTP ${probeState.httpStatus ?? 200}`
                            : `✕ PROMO DADA DE BAJA (${probeState.httpStatus ?? 404})`}
                    </span>
                    {selected.rule.requiresSpecificPaymentApp && (
                      <span className="px-2 py-0.5 rounded-md bg-[#D4FF33]/15 text-[#D4FF33] border border-[#D4FF33]/30 font-bold">
                        {selected.rule.requiresSpecificPaymentApp}
                      </span>
                    )}
                  </div>

                  {selected.rule.sourceCatalogUrl && (
                    <a
                      href={selected.rule.sourceCatalogUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#D4FF33] hover:underline font-bold tabular-nums"
                    >
                      Portal Oficial #{probeState.hashPrefix.slice(0, 8)} ↗
                    </a>
                  )}
                </div>

                {selected.rule.evidence && (
                  <details className="group">
                    <summary className="cursor-pointer opacity-65 hover:opacity-100 select-none list-none flex items-center gap-1">
                      <span>▸ Ver extracto textual capturado del portal bancario</span>
                    </summary>
                    <p className="mt-1.5 p-2.5 rounded-lg bg-black/40 border border-white/10 text-[10px] text-[#2EE59D]/90 leading-relaxed">
                      {selected.rule.evidence}
                    </p>
                  </details>
                )}
              </div>
            </>
          )}
        </div>

        {/* ALERTA DE COMPRA MÍNIMA */}
        {breakdown?.belowMinPurchase && selected?.rule.minPurchaseUYU && (
          <div className="p-3.5 rounded-2xl bg-[#FF5A36]/15 border border-[#FF5A36]/40 font-mono text-xs space-y-1 tabular-nums">
            <div className="font-bold text-[#FF5A36] uppercase">
              COMPRA MÍNIMA REQUERIDA ({formatUYU(selected.rule.minPurchaseUYU)})
            </div>
            <p className="opacity-85 text-[11px] font-sans leading-relaxed">
              Esta promoción requiere un ticket neto mínimo de <strong>{formatUYU(selected.rule.minPurchaseUYU)}</strong> para activar el {selected.rule.percentage}% de descuento bancario.
            </p>
          </div>
        )}

        {/* ALERTA DE TOPE SUPERADO */}
        {breakdown?.isCapExceeded && selected && (
          <div className="p-3.5 rounded-2xl bg-[#FF5A36]/15 border border-[#FF5A36]/40 font-mono text-xs space-y-1 tabular-nums">
            <div className="font-bold text-[#FF5A36] uppercase">
              ALERTA DE TOPE BANCARIO SUPERADO ({formatUYU(selected.rule.maxCapUYU ?? 0)})
            </div>
            <p className="opacity-85 text-[11px] font-sans leading-relaxed">
              El {breakdown.nominalPct}% nominal sería {formatUYU(breakdown.uncappedBankDiscount)}, pero el emisor reintegra hasta{' '}
              <strong>{formatUYU(breakdown.bankDiscount)}</strong>. Tu descuento bancario efectivo baja a{' '}
              <strong>{breakdown.effectiveBankPct.toFixed(1)}%</strong>.
              {breakdown.optimalSpendForCap ? (
                <>
                  {' '}
                  Rinde al 100% hasta <strong>{formatUYU(breakdown.optimalSpendForCap)}</strong> de compra.
                </>
              ) : null}
            </p>
          </div>
        )}

        {/* TOGGLE LEY 19.210 */}
        {possibleIvaPoints > 0 && (
          <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 cursor-pointer">
            <div>
              <span className="font-mono text-xs font-bold text-[#2EE59D] block tabular-nums">
                {possibleIvaPoints === IVA_GASTRO_POINTS
                  ? `LEY 19.210 · -${IVA_GASTRO_POINTS} PTS IVA GASTRONOMÍA (≈7.38%)`
                  : `LEY 19.210 · -${IVA_DEBIT_POINTS} PTS IVA DÉBITO/PREPAGA (≈1.64%)`}
              </span>
              <span className="text-xs opacity-70">
                Se descuenta automáticamente en el voucher del POS antes del reintegro bancario.
              </span>
            </div>
            <input
              type="checkbox"
              checked={applyIva}
              onChange={(e) => setApplyIva(e.target.checked)}
              className="w-5 h-5 accent-[#D4FF33] rounded cursor-pointer shrink-0"
            />
          </label>
        )}

        {/* TOPE YA CONSUMIDO EN EL MES */}
        {showCapUsed && (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <label htmlFor="cap-used" className="font-mono text-[11px] opacity-80">
              ¿YA USÁS PARTE DEL TOPE ESTE {selected?.rule.capPeriod === 'día' ? 'DÍA' : 'MES'}?
            </label>
            <div className="relative w-28 shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs opacity-50">
                $U
              </span>
              <input
                id="cap-used"
                type="text"
                inputMode="numeric"
                value={capUsedInput}
                onChange={(e) => setCapUsedInput(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                placeholder="0"
                className="w-full bg-black/40 text-white font-mono text-xs font-bold tabular-nums rounded-xl pl-8 pr-2.5 py-1.5 border border-white/15 focus:border-[#D4FF33] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* RANKING CARA A CARA DE PLÁSTICOS PARA ESTE LOCAL */}
        <div className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-widest opacity-65 block">
             TODAS LAS TARJETAS CON BENEFICIO EN {merchant.name.toUpperCase()}
          </span>
          {options.map((o) => {
            const isSelected = selected?.rule.id === o.rule.id;
            const isBestOwned = bestOwned?.rule.id === o.rule.id;
            const isBestMarket = marketBeatsYou && bestMarket?.rule.id === o.rule.id;
            return (
              <div
                key={o.rule.id}
                className={`rounded-2xl border overflow-hidden transition-[border-color,background-color,opacity] duration-200 ${
                  isSelected
                    ? 'bg-[#D4FF33]/10 border-[#D4FF33]'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/25'
                } ${o.active ? '' : 'opacity-55'}`}
              >
                <button
                  onClick={() => setSelectedRuleId(o.rule.id)}
                  className="t-press w-full p-3 text-left flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tabular-nums ${BANK_SKIN_CLASS[o.card.issuerId]}`}
                      >
                        {o.rule.percentage}% OFF
                      </span>
                      <span className="font-display font-bold text-xs sm:text-sm">{o.card.fullName}</span>
                      {isBestOwned && (
                        <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-md bg-[#D4FF33] text-[#0B0C0E]">
                          ★ MEJOR EN TU BILLETERA
                        </span>
                      )}
                      {o.isOwned && !isBestOwned && (
                        <span className="font-mono text-[9px] px-2 py-0.5 rounded-md bg-white/10 text-[#D4FF33]">
                          ● TU TARJETA
                        </span>
                      )}
                      {o.inactiveReason && (
                        <span className="font-mono text-[9px] px-2 py-0.5 rounded-md bg-white/10 opacity-75">
                          {o.inactiveReason.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] opacity-70 mt-1 tabular-nums">
                      {o.rule.refundType === 'En el acto' ? 'En caja' : 'Estado de cuenta'} · {capLabel(o.rule)} ·{' '}
                      {daysLabel(o.rule)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <span className="block font-display font-bold text-sm text-[#D4FF33]">
                      -{formatUYU(o.savings.totalSaved)}
                    </span>
                    <span className="font-mono text-[10px] opacity-65">
                      Pagás {formatUYU(o.savings.precioReal)}
                    </span>
                  </div>
                </button>

                {isBestMarket && (
                  <button
                    onClick={() => onUpsell(o.card)}
                    className="t-press w-full px-3 py-2 border-t border-white/10 bg-black/35 flex items-center justify-between font-mono text-[11px] tabular-nums"
                  >
                    <span className="opacity-85">
                      SUMÁS{' '}
                      <strong className="text-[#D4FF33]">
                        +{formatUYU(o.savings.totalSaved - (bestOwned?.savings.totalSaved ?? 0))}
                      </strong>{' '}
                      CON ESTA TARJETA
                    </span>
                    <span className="font-bold text-[#D4FF33]">SOLICITAR ↗</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER (CONCENTRIC RADIUS: 28px Sheet - 16px p-4 = 12px rounded-xl button) */}
      <div className="p-4 px-6 border-t border-white/15 bg-black/50">
        <button
          onClick={onClose}
          className="t-press w-full py-3.5 rounded-xl bg-[#D4FF33] text-[#0B0C0E] font-display font-bold text-xs uppercase tracking-wider hover:brightness-105"
        >
          LISTO · VOLVER A COMERCIOS
        </button>
      </div>
    </Sheet>
  );
}
