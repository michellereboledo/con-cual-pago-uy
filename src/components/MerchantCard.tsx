import { KeyboardEvent } from 'react';
import { DayOfWeek, IssuerId, Merchant, MerchantEvaluation, WalletCard } from '../types/discount';
import { capLabel, computeSavings, daysLabel, formatUYU, getOptimalSpend } from '../lib/engine';
import { MerchantLogo } from './MerchantLogo';

interface MerchantCardProps {
  merchant: Merchant;
  evaluation: MerchantEvaluation;
  selectedDay: DayOfWeek;
  spendAmount: number;
  isPinned: boolean;
  isFavorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onUpsell: (card: WalletCard) => void;
}

export const BANK_SKIN_CLASS: Record<IssuerId, string> = {
  itau: 'bank-itau',
  brou: 'bank-brou',
  santander: 'bank-santander',
  scotiabank: 'bank-scotiabank',
  bbva: 'bank-bbva',
  prex: 'bank-prex',
  oca: 'bank-oca',
  hsbc: 'bank-hsbc',
  heritage: 'bank-heritage',
  creditel: 'bank-creditel',
  anda: 'bank-anda',
  midinero: 'bank-midinero',
  mercadopago: 'bank-mercadopago',
};

export function MerchantCard({
  merchant,
  evaluation,
  selectedDay,
  spendAmount,
  isPinned,
  isFavorite,
  onOpen,
  onToggleFavorite,
  onUpsell,
}: MerchantCardProps) {
  const { bestWalletMatch, bestNonWalletMatch, bestOverallMatch, hasFomoUpsell, walletMatches } = evaluation;
  const primaryMatch = bestWalletMatch ?? bestOverallMatch;
  const inWallet = Boolean(bestWalletMatch);
  const extraWalletCount = Math.max(0, walletMatches.length - 1);

  const primarySavings = primaryMatch
    ? computeSavings({
        merchant,
        rule: primaryMatch.rule,
        card: primaryMatch.card,
        amount: spendAmount,
        applyIva: true,
        capAlreadyUsed: 0,
      })
    : null;

  const upsellSavings =
    hasFomoUpsell && bestNonWalletMatch
      ? computeSavings({
          merchant,
          rule: bestNonWalletMatch.rule,
          card: bestNonWalletMatch.card,
          amount: spendAmount,
          applyIva: true,
          capAlreadyUsed: 0,
        })
      : null;

  const extraUpsellUYU =
    upsellSavings && primarySavings
      ? Math.max(0, upsellSavings.totalSaved - (inWallet ? primarySavings.totalSaved : 0))
      : upsellSavings
        ? upsellSavings.totalSaved
        : 0;

  const optimalSpend = primaryMatch ? getOptimalSpend(primaryMatch.rule) : null;
  const hitCap = primarySavings?.isCapExceeded ?? false;
  const effectivePct = primarySavings ? Math.round(primarySavings.effectiveTotalPct) : 0;
  const capUsagePct =
    optimalSpend && optimalSpend > 0
      ? Math.min(100, Math.round((spendAmount / optimalSpend) * 100))
      : primaryMatch
        ? 38
        : 0;

  const meterColor = hitCap ? 'bg-[#FF5A36]' : 'bg-[#2EE59D]';
  const meterStatusText = primaryMatch
    ? hitCap && primaryMatch.rule.maxCapUYU
      ? `Supera el tope de ${formatUYU(primaryMatch.rule.maxCapUYU)}`
      : optimalSpend
        ? `Aprovechás el 100% comprando hasta ${formatUYU(optimalSpend)}`
        : primaryMatch.rule.capNotPublished
          ? `Tope según bases del banco`
          : `Sin tope de reintegro bancario`
    : merchant.appliesLey19210
      ? 'Descuento automático Ley 19.210 (-9 pts IVA)'
      : `Sin descuento activo el ${selectedDay.toLowerCase()}`;

  const dynamicPinnedBanner = primaryMatch
    ? `${primaryMatch.rule.percentage}% OFF con ${primaryMatch.card.issuerName} · ${daysLabel(primaryMatch.rule)}`
    : merchant.sponsoredPromoTag ?? 'Destacado del día';

  const handleKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKey}
      className={`optical-glass optical-glass-hover ${isPinned ? 'prismatic-rim' : ''} perforated-pass cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4FF33]`}
    >
      {isPinned && (
        <div className="px-4 sm:px-5 py-1.5 bg-[#D4FF33]/15 border-b border-[#D4FF33]/25 flex items-center justify-between text-[11px] font-semibold gap-2">
          <span className="text-[#D4FF33] truncate">
            ★ Destacado para vos hoy · {dynamicPinnedBanner}
          </span>
          <span className="shrink-0 font-mono text-[10px] opacity-80 tabular-nums">#01</span>
        </div>
      )}

      <div className="flex flex-row items-stretch">
        {/* ZONA IZQUIERDA: LOGO DEL NEGOCIO + NOMBRE + TARJETA RECOMENDADA */}
        <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between min-w-0">
          <div>
            {/* CABECERA DEL NEGOCIO CON LOGO COLORIDO + TÍTULO + FAVORITO */}
            <div className="flex items-start gap-3">
              <MerchantLogo
                merchantId={merchant.id}
                merchantName={merchant.name}
                category={merchant.category}
                size="md"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-base sm:text-xl tracking-tight leading-snug">
                      {merchant.name}
                    </h3>
                    <p className="text-xs opacity-75 mt-0.5 line-clamp-1">{merchant.subtitle}</p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite();
                    }}
                    aria-label={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                    aria-pressed={isFavorite}
                    className={`hit-target-44 t-press t-icon-swap w-8 h-8 rounded-full text-xs border shrink-0 ${
                      isFavorite
                        ? 'bg-[#D4FF33] text-[#0B0C0E] border-[#D4FF33] font-bold'
                        : 'bg-white/[0.06] border-white/12 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <span className="t-icon-swap-item" data-active={isFavorite ? 'true' : 'false'} aria-hidden="true">
                      ★
                    </span>
                    <span className="t-icon-swap-item" data-active={isFavorite ? 'false' : 'true'} aria-hidden="true">
                      ☆
                    </span>
                  </button>
                </div>

                {/* PÍLDORAS AMIGABLES DE RUBRO Y ESTADO */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/[0.07] border border-white/10">
                    {merchant.category}
                  </span>
                  {inWallet ? (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#D4FF33]/15 text-[#D4FF33] tabular-nums">
                      ● Tu tarjeta{extraWalletCount > 0 ? ` (+${extraWalletCount})` : ''}
                    </span>
                  ) : primaryMatch ? (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.06] opacity-75">
                      Otra tarjeta
                    </span>
                  ) : null}
                  {merchant.appliesLey19210 && (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#2EE59D]/15 text-[#2EE59D] border border-[#2EE59D]/30 tabular-nums">
                      -9 pts IVA
                    </span>
                  )}
                  {primaryMatch?.rule.legalTextHash && (
                    <span
                      className="font-mono text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#2EE59D]/12 text-[#2EE59D] border border-[#2EE59D]/25 tabular-nums"
                      title={`Verificado contra portal oficial (${primaryMatch.rule.sourceCatalogUrl}) · SHA-256 #${primaryMatch.rule.legalTextHash.slice(0, 8)}`}
                    >
                      ✓ VERIFICADO #{primaryMatch.rule.legalTextHash.slice(0, 6)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CAJA DE TARJETA GANADORA — DISEÑO CÁLIDO Y DIRECTO */}
          <div className="mt-3 pt-2.5 border-t border-white/10 space-y-2">
            {primaryMatch ? (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.05] border border-white/10 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold opacity-70">Pagá con:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full ${BANK_SKIN_CLASS[primaryMatch.card.issuerId]} font-display font-bold text-[11px] shadow-sm shrink-0`}
                  >
                    {primaryMatch.card.issuerName}
                  </span>
                  <span className="font-display font-bold text-xs sm:text-sm leading-tight">
                    {primaryMatch.card.fullName}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] opacity-80 tabular-nums">
                  <span>
                    {primaryMatch.rule.refundType === 'En el acto'
                      ? 'Te descuentan en el momento en caja'
                      : 'Te reintegran en el estado de cuenta'}
                  </span>
                  <span className="opacity-40">·</span>
                  <span>{capLabel(primaryMatch.rule)}</span>
                </div>
              </div>
            ) : null}

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1 gap-2 tabular-nums">
                <span className={`truncate ${hitCap ? 'text-[#FF5A36] font-semibold' : 'opacity-75'}`}>
                  {meterStatusText}
                </span>
                <span className="font-semibold shrink-0 tabular-nums">{effectivePct}% ahorro real</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${meterColor} transition-[width,background-color] duration-300 ease-out`}
                  style={{ width: `${capUsagePct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ZONA DERECHA: TALÓN DE AHORRO (.pass-CheckStub) AMIGABLE */}
        <div className="pass-CheckStub w-[124px] sm:w-[162px] shrink-0 p-3 sm:p-5 flex flex-col items-center justify-center text-center group">
          <div>
            <span className="text-[10px] sm:text-[11px] font-semibold opacity-75 block">
              {primaryMatch ? 'Descuento' : merchant.appliesLey19210 ? 'Ley 19.210' : 'Ver días'}
            </span>
            <div className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight leading-none mt-0.5 tabular-nums">
              {primaryMatch ? (
                <>
                  {primaryMatch.rule.percentage}
                  <span className="text-lg sm:text-xl">%</span>
                </>
              ) : merchant.appliesLey19210 ? (
                <>
                  7.4<span className="text-lg sm:text-xl">%</span>
                </>
              ) : (
                <span className="text-sm font-sans font-bold">Ver</span>
              )}
            </div>
          </div>

          {primarySavings && primarySavings.totalSaved > 0 && (
            <div
              className={`mt-2 sm:mt-3 px-2.5 py-1.5 rounded-2xl w-full shadow-sm ${
                inWallet
                  ? 'bg-[#D4FF33] text-[#0B0C0E]'
                  : 'bg-white/10 border border-white/20'
              }`}
            >
              <span className="text-[9px] sm:text-[10px] font-bold block leading-none opacity-85">
                {inWallet ? 'Te ahorrás' : 'Con otra'}
              </span>
              <span className="font-display font-extrabold text-sm sm:text-base leading-tight block tabular-nums mt-0.5">
                {formatUYU(primarySavings.totalSaved)}
              </span>
            </div>
          )}

          {primarySavings && (
            <span className="mt-1.5 text-[11px] font-semibold opacity-85 tabular-nums block">
              Pagás {formatUYU(primarySavings.precioReal)}
            </span>
          )}

          <span className="mt-1 text-[10px] sm:text-[11px] font-bold text-[#D4FF33] opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-[transform,opacity] duration-150 ease-out">
            Ver detalle →
          </span>
        </div>
      </div>

      {/* SUGERENCIA DE OTRA TARJETA (SOLO SI SUMA MÁS) */}
      {hasFomoUpsell && bestNonWalletMatch && extraUpsellUYU > 0 && (
        <div className="px-4 sm:px-5 py-2.5 bg-black/25 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#2EE59D] shrink-0" />
            <span className="opacity-90 truncate tabular-nums">
              Tip: con <strong>{bestNonWalletMatch.card.fullName}</strong> ({bestNonWalletMatch.rule.percentage}%) te ahorrás{' '}
              <strong className="text-[#D4FF33] tabular-nums">+{formatUYU(extraUpsellUYU)} más</strong>
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpsell(bestNonWalletMatch.card);
            }}
            className="hit-target-44 t-press text-[11px] font-bold text-[#D4FF33] hover:underline shrink-0"
          >
            Ver tarjeta ↗
          </button>
        </div>
      )}
    </article>
  );
}
