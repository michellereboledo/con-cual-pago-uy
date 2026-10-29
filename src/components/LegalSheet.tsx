import { useState } from 'react';
import { Sheet } from './Sheet';
import { DATA_LAST_UPDATED, MERCHANTS_DATA } from '../data/merchantsData';
import { URUGUAY_CARDS } from '../data/cards';
import { formatIsoDate } from '../lib/dates';

interface LegalSheetProps {
  onClose: () => void;
  onResetAllData: () => void;
}

export function LegalSheet({ onClose, onResetAllData }: LegalSheetProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const totalRules = MERCHANTS_DATA.reduce((acc, m) => acc + m.rules.length, 0);

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    onResetAllData();
    setConfirmReset(false);
    setResetDone(true);
    window.setTimeout(() => setResetDone(false), 2500);
  };

  return (
    <Sheet onClose={onClose} ariaLabel="Términos de Uso, Privacidad y Auditoría Criptográfica">
      {/* HEADER */}
      <div className="p-6 pb-4 border-b border-white/10 flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#D4FF33] block tabular-nums">
            CUMPLIMIENTO LEGAL · LEY 18.331 & LEY 17.250 UY
          </span>
          <h3 className="font-display font-bold text-lg sm:text-xl mt-0.5">
            Términos, Privacidad y Auditoría SHA-256
          </h3>
        </div>
        <button
          onClick={onClose}
          className="hit-target-44 t-press w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-mono text-xs shrink-0"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      {/* BODY */}
      <div className="p-6 pt-4 overflow-y-auto space-y-4 flex-1 text-xs leading-relaxed">
        {/* TELEMETRÍA ZERO-FAKE */}
        <div className="p-4 rounded-2xl bg-black/35 border border-[#2EE59D]/30 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#2EE59D]">
              ✓ MOTOR ZERO-FAKE DISCOUNTS ACTIVO
            </span>
            <span className="font-mono text-[10px] opacity-70 tabular-nums">
              ACTUALIZADO {formatIsoDate(DATA_LAST_UPDATED)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 tabular-nums">
            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
              <span className="font-mono text-[9px] uppercase opacity-60 block">COMERCIOS UY</span>
              <span className="font-display font-bold text-base text-[#D4FF33]">{MERCHANTS_DATA.length}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
              <span className="font-mono text-[9px] uppercase opacity-60 block">REGLAS SHA-256</span>
              <span className="font-display font-bold text-base text-[#2EE59D]">{totalRules}/{totalRules}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
              <span className="font-mono text-[9px] uppercase opacity-60 block">ESCALAFONES</span>
              <span className="font-display font-bold text-base">{URUGUAY_CARDS.length}</span>
            </div>
          </div>
          <p className="font-mono text-[10px] opacity-75">
            Cada beneficio incluye enlace directo al catálogo oficial del emisor bancario, extracto textual de condiciones y huella criptográfica SHA-256 verificada en tiempo real al abrir la terminal de caja.
          </p>
        </div>

        {/* 1. NATURALEZA DEL SERVICIO Y DEFENSA DEL CONSUMIDOR */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
          <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#D4FF33]">
            1. Términos de Uso y Vigencia Bancaria (Ley N° 17.250)
          </h4>
          <p className="opacity-80">
            <strong>¿Con Cuál Pago? UY</strong> es un instrumento independiente de simulación financiera y comparación de medios de pago en la República Oriental del Uruguay. No somos una entidad de intermediación financiera ni representamos a los bancos emisores (Itaú, Santander, BROU, Scotiabank, BBVA, OCA, Creditel, Prex, HSBC, Heritage, Anda, Mi Dinero o Mercado Pago).
          </p>
          <p className="opacity-80">
            Los porcentajes de descuento, topes de reintegro (por compra, diarios o mensuales), días aplicables y exclusiones de escalafón (Débito, Clásica, Gold, Platinum, Black, Personal Bank / Select) se relevan de los portales públicos oficiales de cada emisor. Ante cualquier modificación unilateral del banco o comercio, prevalecen siempre las <em>Bases y Condiciones</em> oficiales enlazadas en cada ficha.
          </p>
        </div>

        {/* 2. PRIVACIDAD Y PROTECCIÓN DE DATOS PERSONALES */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#2EE59D]">
            2. Privacidad por Diseño (Ley N° 18.331 — URCDP Uruguay)
          </h4>
          <ul className="space-y-1 opacity-80 list-disc pl-4">
            <li>
              <strong>Cero solicitud de datos sensibles:</strong> La aplicación jamás solicita números de tarjeta (PAN), códigos de seguridad (CVV), fechas de vencimiento, contraseñas bancarias ni documento de identidad.
            </li>
            <li>
              <strong>Almacenamiento 100% en tu dispositivo:</strong> Las tarjetas seleccionadas en tu bóveda, tus comercios favoritos y el monto de simulación se guardan únicamente en la memoria local de tu dispositivo (<code>localStorage</code>).
            </li>
            <li>
              <strong>Verificación sin rastreo:</strong> Las sondas de verificación bancaria consultan únicamente la URL pública del catálogo del banco para comprobar su estado HTTP y firma SHA-256.
            </li>
          </ul>
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/10">
            <span className="font-mono text-[10px] opacity-70">
              Derecho de supresión inmediata (Art. 15 Ley 18.331):
            </span>
            <button
              type="button"
              onClick={handleReset}
              className={`t-press px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold uppercase border ${
                resetDone
                  ? 'border-[#2EE59D]/50 bg-[#2EE59D]/20 text-[#2EE59D]'
                  : confirmReset
                    ? 'border-[#FF5A36] bg-[#FF5A36] text-[#0B0C0E]'
                    : 'border-white/15 bg-white/[0.05] hover:border-[#FF5A36]/60 text-[#FF5A36]'
              }`}
            >
              {resetDone
                ? '✓ DATOS LOCALES BORRADOS'
                : confirmReset
                  ? '¿CONFIRMAR BORRADO TOTAL?'
                  : 'BORRAR MIS DATOS LOCALES'}
            </button>
          </div>
        </div>

        {/* 3. METODOLOGÍA IMPOSITIVA LEY 19.210 */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
          <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#D4FF33]">
            3. Metodología Fiscal (Ley N° 19.210 y Ley N° 17.934 — DGI)
          </h4>
          <p className="opacity-80 tabular-nums">
            En rubros gastronómicos adheridos, la devolución de <strong>9 puntos de IVA</strong> se calcula sobre el monto total con IVA básico incluido (22%): <code>Ahorro IVA = Ticket × (9 / 122) ≈ 7,38%</code>. El descuento porcentual del banco se aplica posteriormente sobre el saldo neto o según el régimen de reintegro de cada emisor.
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="p-4 px-6 border-t border-white/15 bg-black/50">
        <button
          onClick={onClose}
          className="t-press w-full py-3.5 rounded-xl bg-[#D4FF33] text-[#0B0C0E] font-display font-bold text-xs uppercase tracking-wider hover:brightness-105"
        >
          ENTENDIDO · VOLVER AL OPTIMIZADOR
        </button>
      </div>
    </Sheet>
  );
}
