import { useMemo, useState } from 'react';
import { Sheet } from './Sheet';
import { ISSUERS, URUGUAY_CARDS } from '../data/cards';
import { BANK_SKIN_CLASS } from './MerchantCard';
import { CARD_MERCHANT_COUNT, normalizeText } from '../lib/engine';
import { MERCHANTS_DATA } from '../data/merchantsData';

interface WalletSheetProps {
  walletSet: ReadonlySet<string>;
  onToggle: (cardId: string) => void;
  onClear: () => void;
  onClose: () => void;
  onDone: () => void;
}

export function WalletSheet({ walletSet, onToggle, onClear, onClose, onDone }: WalletSheetProps) {
  const [query, setQuery] = useState('');
  const [bankFilter, setBankFilter] = useState<string>('TODOS');

  const activeCards = useMemo(
    () => URUGUAY_CARDS.filter((c) => walletSet.has(c.id)),
    [walletSet]
  );

  // Porcentaje real de comercios donde el usuario tiene al menos 1 descuento con su billetera
  const coveragePct = useMemo(() => {
    if (walletSet.size === 0) return 0;
    const coveredCount = MERCHANTS_DATA.filter((m) =>
      m.rules.some((r) => r.cardIds.some((id) => walletSet.has(id)))
    ).length;
    return Math.round((coveredCount / MERCHANTS_DATA.length) * 100);
  }, [walletSet]);

  const visibleCards = useMemo(() => {
    const q = normalizeText(query.trim());
    return URUGUAY_CARDS.filter((c) => {
      const matchesBank = bankFilter === 'TODOS' || c.issuerId === bankFilter;
      const matchesQuery =
        !q || normalizeText(`${c.issuerName} ${c.fullName} ${c.tierName} ${c.type}`).includes(q);
      return matchesBank && matchesQuery;
    });
  }, [query, bankFilter]);

  return (
    <Sheet onClose={onClose} ariaLabel="Bóveda de Plásticos Uruguay">
      {/* HEADER */}
      <div className="p-6 pb-4 border-b border-white/10 flex items-start justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#D4FF33]">
            CONFIGURACIÓN DE BILLETERA
          </span>
          <h2 className="font-display font-bold text-xl sm:text-2xl mt-0.5">
            Mis Tarjetas{' '}
            <span className="font-editorial italic font-normal text-xl sm:text-2xl opacity-80">Uruguay</span>
          </h2>
        </div>
        <button
          onClick={onClose}
          className="hit-target-44 t-press w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-mono text-xs"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      {/* MEDIDOR DE COBERTURA Y PLÁSTICOS ACTIVOS */}
      <div className="px-6 py-3.5 bg-black/25 border-b border-white/10">
        <div className="flex items-center justify-between font-mono text-xs mb-1.5 tabular-nums">
          <span className="opacity-75">COBERTURA REAL DE DESCUENTOS EN URUGUAY</span>
          <span className="font-bold text-[#D4FF33] tabular-nums">{coveragePct}% CUBIERTO</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-[#D4FF33] transition-[width] duration-300 ease-out"
            style={{ width: `${coveragePct}%` }}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {activeCards.length === 0 ? (
            <span className="font-mono text-xs opacity-60">
              Seleccioná al menos un plástico abajo...
            </span>
          ) : (
            activeCards.map((c) => (
              <div
                key={c.id}
                className={`shrink-0 px-3 py-1.5 rounded-xl ${BANK_SKIN_CLASS[c.issuerId]} text-white flex items-center gap-2 border border-white/25 shadow`}
              >
                <span className="font-mono text-[10px] font-bold uppercase">{c.issuerName}</span>
                <span className="text-xs font-display font-bold">{c.tierName}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* BUSCADOR Y PÍLDORAS POR EMISOR */}
      <div className="px-6 pt-3.5 pb-2 space-y-2.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar por banco o tarjeta (Itaú, BROU, Santander, Scotiabank, BBVA, OCA)..."
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/12 text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4FF33]"
        />
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setBankFilter('TODOS')}
            className={`t-press px-3 py-1.5 rounded-lg font-mono text-[11px] whitespace-nowrap ${
              bankFilter === 'TODOS'
                ? 'bg-[#D4FF33] text-[#0B0C0E] font-bold'
                : 'bg-white/[0.06] opacity-75 hover:opacity-100'
            }`}
          >
            TODOS
          </button>
          {ISSUERS.map((issuer) => {
            const active = bankFilter === issuer.id;
            return (
              <button
                key={issuer.id}
                onClick={() => setBankFilter(issuer.id)}
                className={`t-press px-3 py-1.5 rounded-lg font-mono text-[11px] uppercase whitespace-nowrap ${
                  active
                    ? 'bg-[#D4FF33] text-[#0B0C0E] font-bold'
                    : 'bg-white/[0.06] opacity-75 hover:opacity-100'
                }`}
              >
                {issuer.name.replace('Banco ', '')}
              </button>
            );
          })}
        </div>
      </div>

      {/* LISTA DE PLÁSTICOS ISO-7810 */}
      <div className="px-6 py-3 overflow-y-auto space-y-2.5 flex-1">
        {visibleCards.map((card, idx) => {
          const isSelected = walletSet.has(card.id);
          const count = CARD_MERCHANT_COUNT.get(card.id) ?? 0;
          const fakeDigits = String(1420 + idx * 317).slice(-4);
          return (
            <button
              key={card.id}
              onClick={() => onToggle(card.id)}
              aria-pressed={isSelected}
              className={`t-press w-full p-3.5 rounded-2xl text-left flex items-center justify-between gap-3 border ${
                isSelected
                  ? 'bg-[#D4FF33]/10 border-[#D4FF33]'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/25'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-14 h-9 rounded-lg ${BANK_SKIN_CLASS[card.issuerId]} p-1.5 flex flex-col justify-between shrink-0 shadow border border-white/20`}
                >
                  <span className="font-mono text-[8px] font-bold leading-none uppercase truncate">
                    {card.issuerName}
                  </span>
                  <span className="font-mono text-[7px] opacity-80 leading-none tabular-nums">
                    •• {fakeDigits}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="font-display font-bold text-sm truncate">{card.fullName}</div>
                  <div className="font-mono text-[11px] opacity-70 mt-0.5 tabular-nums">
                    {card.type.toUpperCase()} ·{' '}
                    <span className="text-[#D4FF33]">{count} comercios adheridos</span>
                  </div>
                </div>
              </div>

              <div
                className={`t-icon-swap w-6 h-6 rounded-lg flex items-center justify-center font-mono text-xs shrink-0 ${
                  isSelected
                    ? 'bg-[#D4FF33] text-[#0B0C0E] font-bold'
                    : 'border border-white/20 text-transparent'
                }`}
              >
                <span className="t-icon-swap-item" data-active={isSelected ? 'true' : 'false'}>
                  ✓
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="p-4 px-6 border-t border-white/15 bg-black/50 backdrop-blur-xl flex items-center justify-between gap-3">
        <div className="font-mono text-xs flex items-center gap-3 tabular-nums">
          <span>
            <strong className="text-[#D4FF33]">{walletSet.size}</strong> PLÁSTICOS ACTIVOS
          </span>
          {walletSet.size > 0 && (
            <button onClick={onClear} className="hit-target-44 t-press underline opacity-60 hover:opacity-100">
              VACIAR
            </button>
          )}
        </div>
        <button
          onClick={onDone}
          className="t-press pl-5 pr-4 py-2.5 rounded-xl bg-[#D4FF33] text-[#0B0C0E] font-display font-bold text-xs tracking-wide hover:brightness-105"
        >
          APLICAR BILLETERA →
        </button>
      </div>
    </Sheet>
  );
}
