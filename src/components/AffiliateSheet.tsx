import { useMemo, useState } from 'react';
import { Sheet } from './Sheet';
import { WalletCard } from '../types/discount';
import { ISSUER_MAP } from '../data/cards';
import { BANK_SKIN_CLASS } from './MerchantCard';
import { daysLabel, formatUYU, getMerchantsUnlockedByCard } from '../lib/engine';

interface AffiliateSheetProps {
  card: WalletCard;
  merchantName: string;
  isOwned: boolean;
  onAddToWallet: () => void;
  onClose: () => void;
}

export function AffiliateSheet({
  card,
  merchantName,
  isOwned,
  onAddToWallet,
  onClose,
}: AffiliateSheetProps) {
  const [submitted, setSubmitted] = useState(false);
  const issuer = ISSUER_MAP.get(card.issuerId);
  const unlocked = useMemo(() => getMerchantsUnlockedByCard(card.id), [card.id]);

  const handleApply = () => {
    setSubmitted(true);
    if (!issuer) return;
    const url = new URL(issuer.applyUrl);
    url.searchParams.set('utm_source', 'precioreal_uy');
    url.searchParams.set('utm_medium', 'referral');
    url.searchParams.set('utm_campaign', card.id);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  const addAndClose = () => {
    if (!isOwned) onAddToWallet();
    onClose();
  };

  return (
    <Sheet onClose={onClose} ariaLabel={`Solicitar ${card.fullName}`}>
      <div className={`p-6 relative shrink-0 ${BANK_SKIN_CLASS[card.issuerId]}`}>
        <button
          onClick={onClose}
          className="hit-target-44 t-press absolute top-5 right-5 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center font-mono text-xs text-white"
          aria-label="Cerrar"
        >
          ✕
        </button>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-black/30 text-white">
          RADAR DE OPORTUNIDAD · {card.type.toUpperCase()}
        </span>
        <h2 className="font-syne font-extrabold text-2xl mt-2 text-white">{card.fullName}</h2>
        <p className="text-xs opacity-90 mt-1 text-white tabular-nums">
          Desbloqueá el máximo retorno en <strong>{merchantName}</strong> y en{' '}
          <strong>{unlocked.length} comercios verificados</strong>.
        </p>
      </div>

      <div className="p-6 space-y-4 overflow-y-auto flex-1">
        <div className="p-4 rounded-2xl bg-black/35 border border-white/10 flex items-center justify-between tabular-nums">
          <div>
            <span className="font-mono text-[10px] uppercase opacity-60 block">
              RETORNO ESTIMADO MENSUAL
            </span>
            <span className="font-display font-bold text-2xl text-[#D4FF33] tabular-nums">
              {formatUYU(card.annualSavingsEstimateUYU / 12)} / mes
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono text-[10px] uppercase opacity-60 block">PROYECCIÓN ANUAL</span>
            <span className="font-display font-bold text-base tabular-nums">
              {formatUYU(card.annualSavingsEstimateUYU)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#D4FF33] block">
            BENEFICIOS OFICIALES VERIFICADOS
          </span>
          {card.affiliatePerks.map((perk) => (
            <div key={perk} className="flex items-start gap-2.5 text-xs">
              <span className="font-mono text-[#D4FF33] font-bold">✓</span>
              <span className="opacity-90 leading-relaxed">{perk}</span>
            </div>
          ))}
        </div>

        {unlocked.length > 0 && (
          <div className="space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-widest opacity-60 block">
              PASES QUE DESBLOQUEÁS CON ESTE PLÁSTICO
            </span>
            <div className="rounded-2xl border border-white/10 divide-y divide-white/10 overflow-hidden bg-black/25">
              {unlocked.slice(0, 6).map(({ merchant, rule }) => (
                <div
                  key={merchant.id}
                  className="flex items-center justify-between px-4 py-2.5 text-xs tabular-nums"
                >
                  <div className="min-w-0">
                    <p className="font-display font-bold truncate">{merchant.name}</p>
                    <p className="font-mono text-[10px] opacity-60 uppercase">{daysLabel(rule)}</p>
                  </div>
                  <span className="font-mono font-bold text-[#D4FF33] shrink-0 tabular-nums">
                    {rule.percentage}% OFF
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!submitted ? (
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleApply}
              className="t-press w-full py-3.5 rounded-xl bg-[#D4FF33] text-[#0B0C0E] font-display font-bold text-xs uppercase tracking-wider hover:brightness-105"
            >
              SOLICITAR EN SITIO OFICIAL DE {issuer?.name.toUpperCase() ?? card.issuerName.toUpperCase()} ↗
            </button>
            <button
              onClick={addAndClose}
              className="t-press w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 font-mono text-xs"
            >
              {isOwned ? 'YA ESTÁ EN TU BÓVEDA · CERRAR' : '+ YA LA TENGO · AGREGAR A MI BÓVEDA'}
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#2EE59D]/15 border border-[#2EE59D]/40 text-center space-y-2">
            <p className="font-display font-bold text-sm">
              Abrimos el canal oficial de {issuer?.name ?? card.issuerName} en otra pestaña
            </p>
            <button
              onClick={addAndClose}
              className="t-press px-5 py-2 rounded-xl bg-[#D4FF33] text-[#0B0C0E] font-mono font-bold text-xs"
            >
              {isOwned ? 'CERRAR' : 'SUMAR A MI BÓVEDA Y CERRAR'}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
