import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, Crown, Info, Search, X } from 'lucide-react';
import { CategoryId, DayOfWeek, IssuerId, Merchant, MerchantEvaluation, WalletCard } from './types/discount';
import { DATA_LAST_UPDATED, MERCHANTS_DATA } from './data/merchantsData';
import { CARD_MAP, DEFAULT_WALLET_CARDS } from './data/cards';
import { DAYS_OF_WEEK, formatIsoDate, formatShortDate, getDateForDay, getTodayDay } from './lib/dates';
import { CARD_MERCHANT_COUNT, computeSavings, evaluateMerchantForWallet, formatUYU, matchesQuery } from './lib/engine';
import { usePersistentState } from './hooks/usePersistentState';
import { useAnimatedUYU, useGsapCardFan } from './hooks/useGsapChoreography';
import { CCP_LIVE_CATALOG_STORAGE_KEY, useLiveCatalogSync } from './lib/live-catalog-sync';
import { BANK_SKIN_CLASS, MerchantCard } from './components/MerchantCard';
import { MerchantLogo } from './components/MerchantLogo';
import { WalletSheet } from './components/WalletSheet';
import { CalculatorSheet } from './components/CalculatorSheet';
import { AffiliateSheet } from './components/AffiliateSheet';
import { ProSheet } from './components/ProSheet';
import { LegalSheet } from './components/LegalSheet';

const CATEGORY_GLYPH_SVG: Record<CategoryId, string[]> = {
  Todos: ['M3 6h18', 'M7 12h10', 'M10 18h4'],
  Favoritos: ['m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  Supermercados: ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0'],
  Farmacias: ['M12 5v14', 'M5 12h14', 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
  Combustible: ['M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16', 'M3 10h12', 'M15 8h2a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2v0a1 1 0 0 0 1-1V9l-3-3'],
  Gastronomía: ['M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2', 'M7 2v20', 'M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7'],
  'Cafés y Fast Food': ['M17 8h1a4 4 0 1 1 0 8h-1', 'M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z', 'M6 2v2', 'M10 2v2', 'M14 2v2'],
  'Moda y Calzado': ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z', 'M16 10a4 4 0 0 1-8 0'],
  'Hogar y Tecnología': ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  'Librerías y Jugueterías': ['M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20'],
  'Cines y Shows': ['M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z', 'M13 5v2', 'M13 17v2', 'M13 11v2'],
  'Viajes y Movilidad': ['M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z'],
};

/** Prioridad de uso cotidiano para que el inicio muestre súper, farmacias, nafta y comida antes que cines 2x1 */
const EVERYDAY_CATEGORY_PRIORITY: Record<CategoryId, number> = {
  Todos: 10,
  Favoritos: 10,
  Supermercados: 10,
  Farmacias: 10,
  Combustible: 10,
  Gastronomía: 9,
  'Cafés y Fast Food': 9,
  'Moda y Calzado': 8,
  'Hogar y Tecnología': 8,
  'Viajes y Movilidad': 7,
  'Librerías y Jugueterías': 6,
  'Cines y Shows': 3,
};

const STORAGE_KEYS = {
  WALLET: 'precioreal_uy_wallet_v2',
  PRO_STATUS: 'precioreal_uy_pro_v1',
  PRO_PHONE: 'precioreal_uy_pro_phone_v1',
  FAVORITES: 'precioreal_uy_favorites_v2',
  SPEND_AMOUNT: 'precioreal_uy_spend_v1',
  THEME: 'precioreal_uy_theme_v1',
};

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'Todos', label: 'Todos' },
  { id: 'Favoritos', label: 'Favoritos' },
  { id: 'Supermercados', label: 'Súper' },
  { id: 'Farmacias', label: 'Farmacias' },
  { id: 'Gastronomía', label: 'Restaurantes' },
  { id: 'Cafés y Fast Food', label: 'Cafés & Fast' },
  { id: 'Combustible', label: 'Nafta' },
  { id: 'Moda y Calzado', label: 'Moda' },
  { id: 'Hogar y Tecnología', label: 'Hogar' },
  { id: 'Librerías y Jugueterías', label: 'Librerías' },
  { id: 'Viajes y Movilidad', label: 'Viajes' },
  { id: 'Cines y Shows', label: 'Cines & Shows' },
];

const TICKET_PRESETS = [800, 1600, 3000, 5000];

const BANK_DIGITS_MAP: Record<IssuerId, string> = {
  itau: '4509',
  brou: '8821',
  santander: '9104',
  scotiabank: '6632',
  bbva: '7741',
  prex: '3019',
  oca: '5520',
  hsbc: '3190',
  heritage: '6700',
  creditel: '8832',
  anda: '5012',
  midinero: '1150',
  mercadopago: '9011',
};

const sanitizeWallet = (raw: unknown): string[] =>
  Array.isArray(raw)
    ? raw.filter((id): id is string => typeof id === 'string' && CARD_MAP.has(id))
    : DEFAULT_WALLET_CARDS;

const sanitizeFavorites = (raw: unknown): string[] =>
  Array.isArray(raw)
    ? raw.filter((id): id is string => typeof id === 'string' && MERCHANTS_DATA.some((m) => m.id === id))
    : [];

const sanitizeBool = (raw: unknown): boolean => raw === true;
const sanitizeString = (raw: unknown): string => (typeof raw === 'string' ? raw : '');
const sanitizeSpend = (raw: unknown): number =>
  typeof raw === 'number' && Number.isFinite(raw) && raw >= 400 && raw <= 15000 ? raw : 1600;

interface EvaluatedMerchant {
  merchant: Merchant;
  evaluation: MerchantEvaluation;
}

export default function App() {
  const now = useMemo(() => new Date(), []);
  const actualToday = useMemo(() => getTodayDay(now), [now]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cardFanRef = useRef<HTMLDivElement>(null);

  // Catálogo vivo Over-The-Air (OTA): arranca con MERCHANTS_DATA / localStorage y sincroniza en background
  const { merchants: liveMerchants } = useLiveCatalogSync();

  // Estado persistente
  const [myWallet, setMyWallet] = usePersistentState<string[]>(STORAGE_KEYS.WALLET, DEFAULT_WALLET_CARDS, sanitizeWallet);
  const [favorites, setFavorites] = usePersistentState<string[]>(STORAGE_KEYS.FAVORITES, [], sanitizeFavorites);
  const [isPro, setIsPro] = usePersistentState<boolean>(STORAGE_KEYS.PRO_STATUS, false, sanitizeBool);
  const [proPhone, setProPhone] = usePersistentState<string>(STORAGE_KEYS.PRO_PHONE, '', sanitizeString);
  const [spendAmount, setSpendAmount] = usePersistentState<number>(STORAGE_KEYS.SPEND_AMOUNT, 1600, sanitizeSpend);
  const [theme, setTheme] = usePersistentState<string>(STORAGE_KEYS.THEME, 'dark', sanitizeString);

  // Filtros
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(actualToday);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMyCards, setOnlyMyCards] = useState(false);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);

  // Modales
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isProOpen, setIsProOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [calculator, setCalculator] = useState<{ merchant: Merchant; defaultRuleId?: string } | null>(null);
  const [affiliate, setAffiliate] = useState<{ card: WalletCard; merchantName: string } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('theme-light');
    } else {
      root.classList.remove('theme-light');
    }
  }, [theme]);

  const walletSet = useMemo(() => new Set(myWallet), [myWallet]);
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const selectedDate = useMemo(() => getDateForDay(selectedDay, now), [selectedDay, now]);

  // Plásticos activos para el Abanico 3D (hasta 4 visibles en abanico)
  const fanCards = useMemo(() => {
    const cards = myWallet
      .map((id) => CARD_MAP.get(id))
      .filter((c): c is WalletCard => Boolean(c));
    return cards.slice(0, 4);
  }, [myWallet]);

  useGsapCardFan(cardFanRef, `${fanCards.map((c) => c.id).join(',')}:${focusedCardId ?? ''}`);

  const focusedCard = useMemo(
    () => (focusedCardId ? CARD_MAP.get(focusedCardId) ?? null : null),
    [focusedCardId]
  );

  const toggleCard = useCallback(
    (cardId: string) =>
      setMyWallet((prev) => (prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId])),
    [setMyWallet]
  );

  const toggleFavorite = useCallback(
    (merchantId: string) =>
      setFavorites((prev) => (prev.includes(merchantId) ? prev.filter((id) => id !== merchantId) : [...prev, merchantId])),
    [setFavorites]
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<CategoryId, number>();
    counts.set('Todos', liveMerchants.length);
    counts.set('Favoritos', favorites.length);
    for (const m of liveMerchants) {
      counts.set(m.category, (counts.get(m.category) ?? 0) + 1);
    }
    return counts;
  }, [liveMerchants, favorites.length]);

  const effectiveWalletSet = useMemo(
    () => (focusedCardId ? new Set([focusedCardId]) : walletSet),
    [focusedCardId, walletSet]
  );

  const evaluations = useMemo<EvaluatedMerchant[]>(
    () =>
      liveMerchants.map((merchant) => ({
        merchant,
        evaluation: evaluateMerchantForWallet(merchant, selectedDay, selectedDate, effectiveWalletSet),
      })),
    [liveMerchants, selectedDay, selectedDate, effectiveWalletSet]
  );

  // Top 3 Mayor Ahorro Cotidiano Hoy (1 mejor opción por rubro cotidiano para evitar repetir 3 cines)
  const topNetReturnDeals = useMemo(() => {
    const candidates = evaluations
      .filter((e) => e.evaluation.bestWalletMatch !== null)
      .map((e) => {
        const match = e.evaluation.bestWalletMatch!;
        const sim = computeSavings({
          merchant: e.merchant,
          rule: match.rule,
          card: match.card,
          amount: spendAmount,
          applyIva: true,
          capAlreadyUsed: 0,
        });
        const priority = EVERYDAY_CATEGORY_PRIORITY[e.merchant.category] ?? 5;
        return { ...e, match, sim, priority };
      })
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.sim.totalSaved - a.sim.totalSaved;
      });

    const picked: typeof candidates = [];
    const seenCategories = new Set<CategoryId>();
    for (const item of candidates) {
      if (!seenCategories.has(item.merchant.category)) {
        seenCategories.add(item.merchant.category);
        picked.push(item);
        if (picked.length === 3) break;
      }
    }
    return picked.length > 0 ? picked : candidates.slice(0, 3);
  }, [evaluations, spendAmount]);

  const livePosBestMatch = topNetReturnDeals[0] ?? null;
  const animatedSpendAmount = useAnimatedUYU(spendAmount);
  const animatedBestPrecioReal = useAnimatedUYU(livePosBestMatch?.sim.precioReal ?? spendAmount);
  const animatedBestTotalSaved = useAnimatedUYU(livePosBestMatch?.sim.totalSaved ?? 0);

  const { displayed, pinnedId, matchingWalletCount } = useMemo(() => {
    const filtered = evaluations.filter(({ merchant, evaluation }) => {
      if (selectedCategory === 'Favoritos' && !favoriteSet.has(merchant.id)) return false;
      if (selectedCategory !== 'Todos' && selectedCategory !== 'Favoritos' && merchant.category !== selectedCategory)
        return false;
      if ((onlyMyCards || focusedCardId) && !evaluation.bestWalletMatch) return false;
      return matchesQuery(merchant, searchQuery);
    });

    const walletHits = filtered.filter((e) => e.evaluation.bestWalletMatch !== null).length;
    const pinned =
      selectedCategory === 'Favoritos' || focusedCardId
        ? undefined
        : filtered.find((e) => e.merchant.isSponsored && e.evaluation.allActiveToday.length > 0);

    const isDefaultAllView = selectedCategory === 'Todos' && !searchQuery.trim();

    const sorted = filtered
      .filter((e) => e !== pinned)
      .sort((a, b) => {
        const favA = favoriteSet.has(a.merchant.id) ? 1 : 0;
        const favB = favoriteSet.has(b.merchant.id) ? 1 : 0;
        if (favB !== favA) return favB - favA;

        const matchA = a.evaluation.bestWalletMatch;
        const matchB = b.evaluation.bestWalletMatch;
        const hasWalletA = matchA ? 1 : 0;
        const hasWalletB = matchB ? 1 : 0;
        if (hasWalletB !== hasWalletA) return hasWalletB - hasWalletA;

        if (isDefaultAllView) {
          const prioA = EVERYDAY_CATEGORY_PRIORITY[a.merchant.category] ?? 5;
          const prioB = EVERYDAY_CATEGORY_PRIORITY[b.merchant.category] ?? 5;
          if (prioB !== prioA) return prioB - prioA;
        }

        const savA = matchA
          ? computeSavings({
              merchant: a.merchant,
              rule: matchA.rule,
              card: matchA.card,
              amount: spendAmount,
              applyIva: true,
              capAlreadyUsed: 0,
            }).totalSaved
          : -1;
        const savB = matchB
          ? computeSavings({
              merchant: b.merchant,
              rule: matchB.rule,
              card: matchB.card,
              amount: spendAmount,
              applyIva: true,
              capAlreadyUsed: 0,
            }).totalSaved
          : -1;
        if (savB !== savA) return savB - savA;
        const maxA = a.evaluation.bestOverallMatch?.rule.percentage ?? 0;
        const maxB = b.evaluation.bestOverallMatch?.rule.percentage ?? 0;
        if (maxB !== maxA) return maxB - maxA;
        return a.merchant.name.localeCompare(b.merchant.name, 'es');
      });

    return {
      displayed: pinned ? [pinned, ...sorted] : sorted,
      pinnedId: pinned?.merchant.id,
      matchingWalletCount: walletHits,
    };
  }, [evaluations, selectedCategory, favoriteSet, onlyMyCards, focusedCardId, searchQuery, spendAmount]);

  const openCalculator = (merchant: Merchant, evaluation: MerchantEvaluation) =>
    setCalculator({
      merchant,
      defaultRuleId: evaluation.bestWalletMatch?.rule.id ?? evaluation.bestOverallMatch?.rule.id,
    });

  return (
    <div className="min-h-screen relative pb-28 selection:bg-[#D4FF33] selection:text-[#0B0C0E]">
      {/* FONDO AMBIENTAL ÓPTICO + GRANO FÍSICO SVG */}
      <div className="chromatic-stage" aria-hidden="true">
        <div className="chromatic-lobe w-[460px] h-[460px] bg-[#D4FF33]/20 -top-32 -left-24" />
        <div
          className="chromatic-lobe w-[420px] h-[420px] bg-sky-400/20 top-1/3 -right-28"
          style={{ animationDelay: '-6s' }}
        />
        <div
          className="chromatic-lobe w-[380px] h-[380px] bg-[#FF5A36]/15 bottom-0 left-1/3"
          style={{ animationDelay: '-11s' }}
        />
        <svg className="w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <filter id="opticalGrain">
            <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#opticalGrain)" />
        </svg>
      </div>

      {/* ========================================================================
          CABECERA SIN COLISIONES — CLARA PARA 20, 40 Y 60 AÑOS
          ======================================================================== */}
      <header className="relative z-30 max-w-7xl mx-auto px-3.5 sm:px-8 pt-3.5 pb-2">
        <div className="flex flex-col gap-2.5">
          {/* FILA 1: MARCA + CONTROLES PRINCIPALES (SIN SOLAPAMIENTO EN 360px-412px) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl optical-glass prismatic-rim flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 28 28" fill="none">
                  <path
                    d="M14 3L25 9.5V18.5L14 25L3 18.5V9.5L14 3Z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  />
                  <path d="M14 3V14M14 14L25 9.5M14 14L3 9.5" stroke="#D4FF33" strokeWidth="1.75" />
                  <circle cx="14" cy="14" r="2.5" fill="#D4FF33" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="font-display font-bold text-base sm:text-xl tracking-tight leading-none truncate">
                  ¿Con Cuál Pago?
                </h1>
                <span className="font-mono text-[10px] opacity-70 hidden sm:inline-block mt-0.5">
                  OPTIMIZADOR DE DESCUENTOS BANCARIOS · URUGUAY
                </span>
              </div>
            </div>

            {/* Controles rápidos (Móvil + Desktop unificados y sin desborde) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="hit-target-44 t-press optical-glass w-9 h-9 sm:w-auto sm:px-3 sm:py-2 rounded-xl flex items-center justify-center gap-1.5 font-mono text-xs"
                aria-label="Cambiar tema claro u oscuro"
                title={theme === 'light' ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'}
              >
                <span className="t-icon-swap w-4 h-4">
                  <span className="t-icon-swap-item" data-active={theme === 'light' ? 'true' : 'false'} aria-hidden="true">
                    ☀
                  </span>
                  <span className="t-icon-swap-item" data-active={theme === 'light' ? 'false' : 'true'} aria-hidden="true">
                    ◐
                  </span>
                </span>
                <span className="hidden md:inline font-mono text-[11px] uppercase tracking-wider">
                  {theme === 'light' ? 'Oscuro' : 'Claro'}
                </span>
              </button>

              <button
                onClick={() => setIsProOpen(true)}
                className="hit-target-44 t-press optical-glass w-9 h-9 sm:w-auto sm:px-3 sm:py-2 rounded-xl flex items-center justify-center gap-1.5"
                aria-label="Alertas Pro por WhatsApp"
              >
                <BellRing className="w-3.5 h-3.5 text-[#D4FF33]" />
                <span className="hidden md:inline font-mono text-[11px] uppercase tracking-wider">
                  {isPro ? 'Pro Activo' : 'Alertas'}
                </span>
              </button>

              <button
                onClick={() => setIsWalletOpen(true)}
                className="hit-target-44 t-press optical-glass prismatic-rim pl-2.5 pr-2 py-1.5 sm:px-3.5 sm:py-2 rounded-xl flex items-center gap-1.5"
              >
                <span className="flex -space-x-1.5">
                  {fanCards.slice(0, 3).map((c) => (
                    <span
                      key={c.id}
                      className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full ${BANK_SKIN_CLASS[c.issuerId]} border border-[#0B0C0E] inline-block`}
                    />
                  ))}
                </span>
                <span className="font-display font-bold text-xs">Tarjetas</span>
                <span className="px-1.5 py-0.5 rounded-md bg-[#D4FF33] text-[#0B0C0E] font-mono font-bold text-[10px] tabular-nums">
                  {myWallet.length}
                </span>
              </button>
            </div>
          </div>

          {/* FILA 2: SELECTOR DE DÍA DE LA SEMANA (7 DÍAS TÁCTILES) */}
          <div
            className="optical-glass p-1 rounded-2xl grid grid-cols-7 items-center gap-0.5 w-full"
            role="tablist"
            aria-label="Seleccionar día de la semana"
          >
            {DAYS_OF_WEEK.map((d) => {
              const isSelected = selectedDay === d.id;
              const isToday = actualToday === d.id;
              return (
                <button
                  key={d.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedDay(d.id)}
                  className={`t-press py-1.5 px-1 sm:px-3 rounded-xl font-mono text-[10px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 tabular-nums ${
                    isSelected
                      ? 'bg-[#D4FF33] text-[#0B0C0E] font-bold shadow-sm'
                      : 'opacity-75 hover:opacity-100 hover:bg-white/[0.05]'
                  }`}
                >
                  <span>{d.short}</span>
                  <span className={`text-[9px] sm:text-[10px] ${isSelected ? 'opacity-100' : 'opacity-65'}`}>
                    {isToday ? 'HOY' : getDateForDay(d.id, now).getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ========================================================================
          ESCENARIO PRINCIPAL (BÚSQUEDA INMEDIATA + TARJETAS 3D + PASES)
          ======================================================================== */}
      <main className="relative z-10 max-w-7xl mx-auto px-3.5 sm:px-8 pt-1.5 space-y-4">
        {/* BARRA DE BÚSQUEDA Y RUBROS ARRIBA DE TODO (ACCESO EN 1 SEGUNDO) */}
        <section className="optical-glass rounded-[24px] p-3 sm:p-4 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 opacity-60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="¿Dónde vas a pagar? (Ej: Tienda Inglesa, Farmashop, Ancap, BROU)..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-sm placeholder-zinc-400 focus:outline-none focus:border-[#D4FF33] transition-[border-color,background-color] duration-200 [&::-webkit-search-cancel-button]:hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="hit-target-44 t-press absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 p-1"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2">
              <button
                onClick={() => setOnlyMyCards((v) => !v)}
                className={`t-press font-mono text-[11px] px-3 py-2 rounded-xl border flex items-center gap-1.5 shrink-0 tabular-nums ${
                  onlyMyCards
                    ? 'bg-[#D4FF33]/15 border-[#D4FF33] text-[#D4FF33] font-bold'
                    : 'bg-white/[0.04] border-white/12 opacity-85 hover:opacity-100'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${onlyMyCards ? 'bg-[#D4FF33]' : 'bg-zinc-400'}`} />
                <span>Solo mis tarjetas ({matchingWalletCount})</span>
              </button>

              <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 font-mono text-[11px] shrink-0 tabular-nums">
                <span className="font-bold text-[#D4FF33]">{displayed.length}</span>{' '}
                <span className="opacity-75">LOCALES</span>
              </div>
            </div>
          </div>

          {/* Píldoras de rubros con geometría SVG */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              const count = categoryCounts.get(cat.id) ?? 0;
              if (cat.id === 'Favoritos' && count === 0 && !active) return null;
              const glyphPaths = CATEGORY_GLYPH_SVG[cat.id] ?? CATEGORY_GLYPH_SVG.Todos;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`t-press pl-3 pr-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1.5 tabular-nums ${
                    active
                      ? 'bg-[#D4FF33] text-[#0B0C0E] font-display font-bold shadow-sm'
                      : 'bg-white/[0.04] border border-white/10 opacity-85 hover:opacity-100 hover:border-white/25'
                  }`}
                >
                  <svg
                    className="w-3.5 h-3.5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {glyphPaths.map((d, i) => (
                      <path key={i} d={d} />
                    ))}
                  </svg>
                  <span>{cat.label}</span>
                  <span className="font-mono text-[10px] opacity-65 tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ====================================================================
              COLUMNA IZQUIERDA (5 COLS): TARJETAS 3D + MONTO DE COMPRA COMPACTO
              ==================================================================== */}
          <section className="lg:col-span-5 lg:sticky lg:top-4 space-y-4">
            <div className="optical-glass prismatic-rim rounded-[28px] p-4 sm:p-5 relative overflow-hidden space-y-3.5">
              {/* CABECERA DE BILLETERA */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-display font-bold text-sm sm:text-base flex items-center gap-2">
                    <span>Mis Tarjetas</span>
                    <span className="font-editorial italic font-normal text-sm opacity-75">
                      tocá una para filtrar
                    </span>
                  </h2>
                </div>
                <button
                  onClick={() => setIsWalletOpen(true)}
                  className="t-press px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 font-mono text-[11px] tabular-nums"
                >
                  + Editar ({myWallet.length})
                </button>
              </div>

              {/* ESCENARIO 3D DE TARJETAS (ALTURA COMPACTA EN MÓVIL PARA VER COMERCIOS SIN SCROLL) */}
              <div
                ref={cardFanRef}
                className="relative h-[152px] sm:h-[195px] w-full flex items-center justify-center"
              >
                {fanCards.length === 0 ? (
                  <div className="w-full h-full rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center p-4 text-center">
                    <p className="font-display font-bold text-sm">No seleccionaste tarjetas</p>
                    <button
                      onClick={() => setIsWalletOpen(true)}
                      className="t-press mt-2 px-4 py-1.5 rounded-xl bg-[#D4FF33] text-[#0B0C0E] font-mono font-bold text-xs"
                    >
                      + Elegir mis tarjetas
                    </button>
                  </div>
                ) : (
                  fanCards.map((card, idx) => {
                    const isFocused = focusedCardId === card.id;
                    const total = fanCards.length;
                    const mid = (total - 1) / 2;
                    const offset = idx - mid;
                    const rot = isFocused ? 0 : offset * 6.5;
                    const tx = isFocused ? 0 : offset * 24;
                    const ty = isFocused ? -8 : Math.abs(offset) * 6;
                    const scale = isFocused ? 1.04 : 1 - Math.abs(offset) * 0.03;
                    const zIndex = isFocused ? 30 : 10 + idx;
                    const ringClass = isFocused ? 'ring-2 ring-[#D4FF33]' : 'border border-white/25';
                    const digits = BANK_DIGITS_MAP[card.issuerId] ?? '4509';
                    const merchantCount = CARD_MERCHANT_COUNT.get(card.id) ?? 12;

                    return (
                      <div
                        key={card.id}
                        onClick={() => setFocusedCardId(isFocused ? null : card.id)}
                        style={{
                          transform: `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg) scale(${scale})`,
                          zIndex,
                        }}
                        className={`iso-card ${BANK_SKIN_CLASS[card.issuerId]} ${ringClass} w-[212px] sm:w-[256px] p-3.5 sm:p-4 flex flex-col justify-between absolute`}
                        title={`Tocar para filtrar beneficios de ${card.fullName}`}
                      >
                        <div className="flex items-start justify-between relative z-10">
                          <div className="min-w-0 pr-2">
                            <div className="font-mono text-[9px] sm:text-[10px] tracking-widest uppercase opacity-80 truncate">
                              {card.issuerName}
                            </div>
                            <div className="font-display font-bold text-xs sm:text-sm tracking-tight leading-tight mt-0.5 truncate">
                              {card.fullName}
                            </div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded-md bg-black/30 backdrop-blur-md font-mono text-[8px] sm:text-[9px] tracking-wider uppercase border border-white/15 shrink-0">
                            {card.type}
                          </span>
                        </div>

                        <div className="flex items-center justify-between my-0.5 relative z-10">
                          <svg className="w-6 h-4 sm:w-7 sm:h-5 opacity-90" viewBox="0 0 36 26" fill="none">
                            <rect
                              x="0.5"
                              y="0.5"
                              width="35"
                              height="25"
                              rx="4.5"
                              fill="url(#chipGrad)"
                              stroke="rgba(255,255,255,0.45)"
                            />
                            <path
                              d="M0 9h12m12 0h12M0 17h12m12 0h12M12 0v26m12-26v26"
                              stroke="rgba(0,0,0,0.32)"
                              strokeWidth="1"
                            />
                            <defs>
                              <linearGradient id="chipGrad" x1="0" y1="0" x2="36" y2="26" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#FDE68A" />
                                <stop offset="0.5" stopColor="#F59E0B" />
                                <stop offset="1" stopColor="#FEF3C7" />
                              </linearGradient>
                            </defs>
                          </svg>

                          <svg
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-75"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path
                              d="M8.5 14.5A4 4 0 018.5 9.5M12 17a7.5 7.5 0 000-10M15.5 19.5a11 11 0 000-15"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>

                        <div className="flex items-end justify-between relative z-10 tabular-nums">
                          <div className="font-mono text-[10px] sm:text-[11px] tracking-widest opacity-85">
                            •••• {digits}
                          </div>
                          <div className="font-mono text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-black/35 text-white/95 border border-white/15 tabular-nums">
                            {merchantCount} locales
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {focusedCard && (
                <div className="px-3 py-1.5 rounded-xl bg-[#D4FF33]/15 border border-[#D4FF33]/35 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] truncate">
                    Filtrando: <strong className="text-[#D4FF33]">{focusedCard.fullName}</strong>
                  </span>
                  <button
                    onClick={() => setFocusedCardId(null)}
                    className="font-mono text-[10px] font-bold underline text-[#D4FF33] shrink-0 ml-2"
                  >
                    Mostrar todas
                  </button>
                </div>
              )}

              {/* SIMULADOR DE MONTO INTEGRADO EN LA MISMA TARJETA (MENOS SCROLL, MÁS CLARIDAD) */}
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#D4FF33] block">
                      SIMULADOR DE COMPRA
                    </span>
                    <span className="font-display font-bold text-sm sm:text-base">
                      ¿Cuánto vas a gastar?
                    </span>
                  </div>
                  <span className="font-display font-bold text-xl sm:text-2xl tracking-tight text-[#D4FF33] tabular-nums">
                    {formatUYU(animatedSpendAmount)}
                  </span>
                </div>

                <input
                  type="range"
                  min={400}
                  max={8000}
                  step={200}
                  value={Math.min(8000, Math.max(400, spendAmount))}
                  onChange={(e) => setSpendAmount(Number(e.target.value))}
                  className="pos-slider"
                  aria-label="Monto de la compra en pesos uruguayos"
                />

                <div className="grid grid-cols-4 gap-1.5">
                  {TICKET_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSpendAmount(preset)}
                      className={`t-press py-1.5 rounded-xl font-mono text-xs tabular-nums border ${
                        spendAmount === preset
                          ? 'border-[#D4FF33]/50 bg-[#D4FF33]/15 text-[#D4FF33] font-bold'
                          : 'border-white/10 bg-white/[0.04] hover:border-[#D4FF33]/40 opacity-85'
                      }`}
                    >
                      {formatUYU(preset)}
                    </button>
                  ))}
                </div>

                {livePosBestMatch && (
                  <button
                    type="button"
                    onClick={() => openCalculator(livePosBestMatch.merchant, livePosBestMatch.evaluation)}
                    className="t-press w-full p-3 rounded-2xl bg-black/30 border border-white/12 flex items-center justify-between gap-3 text-left tabular-nums"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MerchantLogo
                        merchantId={livePosBestMatch.merchant.id}
                        merchantName={livePosBestMatch.merchant.name}
                        category={livePosBestMatch.merchant.category}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold text-[#D4FF33] block truncate">
                          Tu mejor opción hoy · {livePosBestMatch.merchant.name}
                        </span>
                        <span className="font-display font-bold text-base sm:text-lg tabular-nums block leading-tight">
                          Te queda en {formatUYU(animatedBestPrecioReal)}
                        </span>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-[#D4FF33] text-[#0B0C0E] font-display font-extrabold text-xs shrink-0 tabular-nums shadow-sm">
                      Ahorrás {formatUYU(animatedBestTotalSaved)}
                    </div>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ====================================================================
              COLUMNA DERECHA (7 COLS): RECOMENDADOS COTIDIANOS + PASES TROQUELADOS
              ==================================================================== */}
          <section className="lg:col-span-7 space-y-4">
            {/* TOP 3 AHORRO COTIDIANO HOY CON LOGOS DE LOS NEGOCIOS */}
            {!searchQuery && selectedCategory === 'Todos' && topNetReturnDeals.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between mb-2 px-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-[#D4FF33]">
                      ★ Recomendados hoy con tus tarjetas
                    </span>
                    <span className="text-xs opacity-70 tabular-nums hidden sm:inline">
                      para una compra de {formatUYU(spendAmount)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {topNetReturnDeals.map(({ merchant, evaluation, match, sim }) => (
                    <button
                      key={merchant.id}
                      onClick={() => openCalculator(merchant, evaluation)}
                      className="t-press optical-glass optical-glass-hover p-3.5 rounded-2xl text-left flex flex-col justify-between group tabular-nums"
                    >
                      <div className="flex items-center gap-2.5">
                        <MerchantLogo
                          merchantId={merchant.id}
                          merchantName={merchant.name}
                          category={merchant.category}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ${BANK_SKIN_CLASS[match.card.issuerId]}`}
                            >
                              {match.card.issuerName} {match.rule.percentage}%
                            </span>
                            <span className="font-display font-extrabold text-xs text-[#D4FF33] tabular-nums">
                              -{formatUYU(sim.totalSaved)}
                            </span>
                          </div>
                          <div className="font-display font-bold text-sm truncate mt-1 group-hover:text-[#D4FF33] transition-colors duration-150">
                            {merchant.name}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px] opacity-80 tabular-nums">
                        <span className="truncate">{match.card.tierName}</span>
                        <span className="shrink-0 font-semibold">Pagás {formatUYU(sim.precioReal)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* LISTA DE PASES TROQUELADOS */}
            <div className="space-y-3.5">
              {displayed.length === 0 ? (
                <div className="optical-glass rounded-[28px] p-10 text-center space-y-3">
                  <p className="font-editorial italic text-2xl">Sin descuentos activos para este filtro</p>
                  <p className="text-xs opacity-75 max-w-sm mx-auto">
                    Probá elegir otro día de la semana arriba o desactivar el filtro de tarjeta específica.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('Todos');
                      setOnlyMyCards(false);
                      setFocusedCardId(null);
                    }}
                    className="t-press px-5 py-2.5 rounded-xl bg-[#D4FF33] text-[#0B0C0E] font-mono font-bold text-xs"
                  >
                    VER TODOS LOS COMERCIOS
                  </button>
                </div>
              ) : (
                displayed.map(({ merchant, evaluation }, idx) => (
                  <div key={merchant.id} className="space-y-3.5">
                    <MerchantCard
                      merchant={merchant}
                      evaluation={evaluation}
                      selectedDay={selectedDay}
                      spendAmount={spendAmount}
                      isPinned={merchant.id === pinnedId}
                      isFavorite={favoriteSet.has(merchant.id)}
                      onOpen={() => openCalculator(merchant, evaluation)}
                      onToggleFavorite={() => toggleFavorite(merchant.id)}
                      onUpsell={(card) => setAffiliate({ card, merchantName: merchant.name })}
                    />

                    {/* Banner simple de Alertas Pro por WhatsApp */}
                    {(idx === 4 || (displayed.length < 5 && idx === displayed.length - 1)) && (
                      <div className="optical-glass prismatic-rim rounded-[24px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#D4FF33] tabular-nums">
                            <Crown className="w-3.5 h-3.5" /> ALERTAS POR WHATSAPP · $100/MES
                          </span>
                          <h3 className="font-display font-bold text-sm sm:text-base">
                            ¿Querés que te avisemos a las 9 AM cuando toque 25% con tus tarjetas?
                          </h3>
                        </div>
                        <button
                          onClick={() => setIsProOpen(true)}
                          className="t-press shrink-0 px-4 py-2.5 rounded-xl bg-[#D4FF33] text-[#0B0C0E] font-mono font-bold text-xs uppercase tracking-wider"
                        >
                          {isPro ? 'Configurar Alertas' : 'Activar por $100 →'}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}

              <div className="pt-2 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/10">
                <p className="text-[11px] font-mono opacity-65 leading-relaxed flex items-start gap-2 tabular-nums">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Datos oficiales verificados al {formatIsoDate(DATA_LAST_UPDATED)} ({MERCHANTS_DATA.length} comercios · 166 reglas SHA-256). Ley 19.210 sobre IVA 22%.
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setIsLegalOpen(true)}
                  className="hit-target-44 t-press self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#D4FF33]/40 font-mono text-[10px] uppercase tracking-wider text-[#D4FF33] shrink-0"
                >
                  Términos, Privacidad y Auditoría SHA-256
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* MODALES EN PORTAL */}
      {isLegalOpen && (
        <LegalSheet
          onClose={() => setIsLegalOpen(false)}
          onResetAllData={() => {
            try {
              window.localStorage.removeItem(CCP_LIVE_CATALOG_STORAGE_KEY);
            } catch {}
            setMyWallet(DEFAULT_WALLET_CARDS);
            setFavorites([]);
            setIsPro(false);
            setProPhone('');
            setSpendAmount(1600);
            setFocusedCardId(null);
          }}
        />
      )}

      {isWalletOpen && (
        <WalletSheet
          walletSet={walletSet}
          onToggle={toggleCard}
          onClear={() => {
            setMyWallet([]);
            setFocusedCardId(null);
          }}
          onClose={() => setIsWalletOpen(false)}
          onDone={() => setIsWalletOpen(false)}
        />
      )}

      {calculator && (
        <CalculatorSheet
          key={calculator.merchant.id}
          merchant={calculator.merchant}
          defaultRuleId={calculator.defaultRuleId}
          selectedDay={selectedDay}
          selectedDate={selectedDate}
          walletSet={walletSet}
          initialAmount={spendAmount}
          onAmountChange={setSpendAmount}
          onClose={() => setCalculator(null)}
          onUpsell={(card) => setAffiliate({ card, merchantName: calculator.merchant.name })}
        />
      )}

      {affiliate && (
        <AffiliateSheet
          key={affiliate.card.id}
          card={affiliate.card}
          merchantName={affiliate.merchantName}
          isOwned={walletSet.has(affiliate.card.id)}
          onAddToWallet={() => toggleCard(affiliate.card.id)}
          onClose={() => setAffiliate(null)}
        />
      )}

      {isProOpen && (
        <ProSheet
          isPro={isPro}
          savedPhone={proPhone}
          walletSet={walletSet}
          now={now}
          onActivate={(phone) => {
            setProPhone(phone);
            setIsPro(true);
            setIsProOpen(false);
          }}
          onCancel={() => {
            setIsPro(false);
            setIsProOpen(false);
          }}
          onClose={() => setIsProOpen(false)}
        />
      )}
    </div>
  );
}
