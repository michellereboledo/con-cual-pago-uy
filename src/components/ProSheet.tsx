import { useMemo, useState } from 'react';
import { Sheet } from './Sheet';
import { daysLabel, getUpcomingSuperDays } from '../lib/engine';
import { formatShortDate } from '../lib/dates';

interface ProSheetProps {
  isPro: boolean;
  savedPhone: string;
  walletSet: ReadonlySet<string>;
  now: Date;
  onActivate: (phone: string) => void;
  onCancel: () => void;
  onClose: () => void;
}

export function normalizeUyPhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('598')) digits = `0${digits.slice(3)}`;
  return /^09\d{7}$/.test(digits) ? digits : null;
}

function formatUyPhone(digits: string): string {
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function ProSheet({
  isPro,
  savedPhone,
  walletSet,
  now,
  onActivate,
  onCancel,
  onClose,
}: ProSheetProps) {
  const [phoneInput, setPhoneInput] = useState(savedPhone ? formatUyPhone(savedPhone) : '09');
  const [touched, setTouched] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const normalized = normalizeUyPhone(phoneInput);

  const upcoming = useMemo(() => {
    const all = getUpcomingSuperDays(walletSet, now, 14);
    return [...all.filter((a) => a.isOwned), ...all.filter((a) => !a.isOwned)].slice(0, 6);
  }, [walletSet, now]);

  const submit = () => {
    setTouched(true);
    if (normalized) {
      onActivate(normalized);
    } else {
      setShakeKey((k) => k + 1);
    }
  };

  return (
    <Sheet onClose={onClose} ariaLabel="Radar VIP WhatsApp">
      <div className="p-6 pb-4 border-b border-white/10 flex items-start justify-between shrink-0">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#D4FF33] tabular-nums">
            MEMBRESÍA PRISMA VIP · $U 100 / MES
          </span>
          <h2 className="font-syne font-extrabold text-2xl mt-0.5">
            Alertas de Pases{' '}
            <span className="font-editorial italic font-normal text-2xl opacity-80">por WhatsApp</span>
          </h2>
          <p className="font-mono text-[11px] opacity-65 mt-0.5 tabular-nums">
            AVISO AUTOMÁTICO A LAS 09:00 AM SEGÚN TUS PLÁSTICOS ACTIVOS
          </p>
        </div>
        <button
          onClick={onClose}
          className="hit-target-44 t-press w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-mono text-xs"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      <div className="p-6 pt-4 space-y-4 overflow-y-auto flex-1">
        <div className="space-y-2.5 text-xs">
          {[
            [
              '01 · DÍAS DE SÚPER (BROU, OCA, SCOTIABANK Y MIDINERO)',
              'Aviso los martes/jueves de BROU Recompensa (10%), lunes de El Dorado con MiDinero (20%) y "Toca Ahorrar" de OCA en Ta-Ta (20%).',
            ],
            [
              '02 · FARMACIAS AL 25% (FARMASHOP, SAN ROQUE Y EL TÚNEL)',
              'Recordatorio los días de 25% OFF con Farmacard Santander, Itaú Personal Bank y MODO Creditel.',
            ],
            [
              '03 · COMBUSTIBLE (ANCAP LUN/VIE Y AXION MIÉRCOLES)',
              'Alerta antes de cargar con el cálculo exacto del tope mensual disponible.',
            ],
          ].map(([title, desc]) => (
            <div key={title} className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
              <strong className="font-mono text-[11px] text-[#D4FF33] block tabular-nums">{title}</strong>
              <span className="opacity-80 mt-1 block leading-relaxed">{desc}</span>
            </div>
          ))}
        </div>

        {upcoming.length > 0 && (
          <div className="space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-widest opacity-60 block tabular-nums">
              PRÓXIMOS PASES DESTACADOS (14 DÍAS)
            </span>
            <div className="rounded-2xl border border-white/10 divide-y divide-white/10 overflow-hidden bg-black/25">
              {upcoming.map((a) => (
                <div
                  key={`${a.rule.id}-${a.date.toISOString()}`}
                  className="flex items-center justify-between gap-2 px-4 py-2.5 tabular-nums"
                >
                  <div className="min-w-0">
                    <p className="font-display font-bold text-xs truncate">
                      {a.day} {formatShortDate(a.date)} · {a.merchant.name}
                    </p>
                    <p className="font-mono text-[10px] opacity-60 truncate">
                      {a.card.fullName} · {daysLabel(a.rule)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block font-mono text-xs font-bold text-[#D4FF33] tabular-nums">
                      {a.rule.percentage}% OFF
                    </span>
                    {a.isOwned && (
                      <span className="font-mono text-[9px] text-[#2EE59D]">● EN BÓVEDA</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          key={shakeKey}
          className={`p-4 rounded-2xl bg-black/35 border border-white/10 ${
            touched && !normalized ? 't-error-shake' : ''
          }`}
        >
          <label htmlFor="pro-phone" className="block font-mono text-[11px] uppercase opacity-75 mb-2">
            CELULAR URUGUAYO PARA WHATSAPP:
          </label>
          <input
            id="pro-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="099 123 456"
            className={`w-full bg-white/[0.05] font-mono text-sm font-bold tabular-nums rounded-xl px-4 py-2.5 border focus:outline-none ${
              touched && !normalized ? 'border-[#FF5A36]' : 'border-white/15 focus:border-[#D4FF33]'
            }`}
          />
          {touched && !normalized && (
            <p className="font-mono text-[11px] text-[#FF5A36] mt-1">
              Ingresá un celular uruguayo válido (ej. 099 123 456).
            </p>
          )}
        </div>

        <button
          onClick={submit}
          className="t-press w-full py-3.5 rounded-xl bg-[#D4FF33] text-[#0B0C0E] font-display font-bold text-xs uppercase tracking-wider hover:brightness-105"
        >
          {isPro ? 'ACTUALIZAR WHATSAPP →' : 'ACTIVAR RADAR VIP · $U 100/MES →'}
        </button>
        {isPro && (
          <button
            onClick={onCancel}
            className="hit-target-44 t-press w-full font-mono text-[11px] opacity-60 hover:opacity-100 underline"
          >
            CANCELAR SUSCRIPCIÓN
          </button>
        )}
      </div>
    </Sheet>
  );
}
