import { CategoryId, IssuerId } from '../types/discount';

interface BrandVisualSpec {
  bg: string;
  fg: string;
  accent?: string;
  monogram: string;
  sublabel?: string;
  shape?: 'circle' | 'pill' | 'shield' | 'cross' | 'arch' | 'bag' | 'diamond';
}

/**
 * Paleta e identidad visual auténtica para los 84 comercios uruguayos.
 * 100% vectorial e instantánea (funciona online y offline sin fallos de red).
 */
export const MERCHANT_BRAND_MAP: Record<string, BrandVisualSpec> = {
  // Supermercados
  'tienda-inglesa': {
    bg: 'linear-gradient(135deg, #0A2246 0%, #163A70 100%)',
    fg: '#FFFFFF',
    accent: '#E11D48',
    monogram: 'TI',
    sublabel: 'INGLESA',
    shape: 'shield',
  },
  tata: {
    bg: 'linear-gradient(135deg, #E31837 0%, #B91C1C 100%)',
    fg: '#FFFFFF',
    accent: '#FDE047',
    monogram: 'Ta-Ta',
    shape: 'pill',
  },
  'el-dorado': {
    bg: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    fg: '#FFFBEB',
    accent: '#FDE68A',
    monogram: 'ED',
    sublabel: 'DORADO',
  },
  'macro-mercado': {
    bg: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
    fg: '#991B1B',
    accent: '#DC2626',
    monogram: 'MM',
    sublabel: 'MACRO',
  },
  frog: {
    bg: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
    fg: '#FFFFFF',
    accent: '#BBF7D0',
    monogram: 'FROG',
    shape: 'circle',
  },
  kinko: {
    bg: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
    fg: '#FFFFFF',
    accent: '#FED7AA',
    monogram: 'K!',
    sublabel: 'KINKO',
  },
  'red-expres': {
    bg: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
    fg: '#FFFFFF',
    accent: '#FCA5A5',
    monogram: 'RE',
    sublabel: 'EXPRES',
  },

  // Farmacias
  farmashop: {
    bg: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 100%)',
    fg: '#FFFFFF',
    accent: '#F472B6',
    monogram: 'FS',
    sublabel: 'FARMASHOP',
    shape: 'cross',
  },
  'san-roque': {
    bg: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
    fg: '#FFFFFF',
    accent: '#5EEAD4',
    monogram: 'SR',
    sublabel: 'SAN ROQUE',
    shape: 'cross',
  },
  'el-tunel': {
    bg: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    fg: '#FFFFFF',
    accent: '#7DD3FC',
    monogram: 'ET',
    sublabel: 'EL TÚNEL',
    shape: 'cross',
  },
  pigalle: {
    bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    fg: '#FFFFFF',
    accent: '#6EE7B7',
    monogram: 'FP',
    sublabel: 'PIGALLE',
    shape: 'cross',
  },
  'tienda-farma': {
    bg: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    fg: '#FFFFFF',
    accent: '#93C5FD',
    monogram: 'TF',
    sublabel: 'FARMA',
    shape: 'cross',
  },
  'farma-glam': {
    bg: 'linear-gradient(135deg, #DB2777 0%, #9D174D 100%)',
    fg: '#FFFFFF',
    accent: '#FBCFE8',
    monogram: 'F&G',
    sublabel: 'GLAM',
  },
  farmacity: {
    bg: 'linear-gradient(135deg, #EA580C 0%, #16A34A 100%)',
    fg: '#FFFFFF',
    accent: '#FFFFFF',
    monogram: 'FC',
    sublabel: 'FARMACITY',
    shape: 'cross',
  },

  // Combustible
  ancap: {
    bg: 'linear-gradient(135deg, #003893 0%, #002366 100%)',
    fg: '#FCD116',
    accent: '#E11D48',
    monogram: 'ANCAP',
    shape: 'shield',
  },

  // Cafés & Fast Food
  pedidosya: {
    bg: 'linear-gradient(135deg, #FA0050 0%, #D90045 100%)',
    fg: '#FFFFFF',
    accent: '#FFE4E6',
    monogram: 'PeYa',
    shape: 'bag',
  },
  'burger-king': {
    bg: 'linear-gradient(135deg, #D62300 0%, #F59E0B 100%)',
    fg: '#FFFBEB',
    accent: '#FDE68A',
    monogram: 'BK',
    sublabel: 'BURGER',
  },
  'rudy-burgers': {
    bg: 'linear-gradient(135deg, #991B1B 0%, #7F1D1D 100%)',
    fg: '#FEF3C7',
    accent: '#F59E0B',
    monogram: 'RUDY',
  },
  'la-panera-rosa': {
    bg: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
    fg: '#FFFFFF',
    accent: '#FCE7F3',
    monogram: 'LPR',
    sublabel: 'PANERA',
  },
  'tea-connection': {
    bg: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
    fg: '#F0FDF4',
    accent: '#86EFAC',
    monogram: 'TEA',
    sublabel: 'CONNECT',
  },
  'cuervo-cafe': {
    bg: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
    fg: '#F9FAFB',
    accent: '#D97706',
    monogram: 'CC',
    sublabel: 'CUERVO',
  },
  'heladeria-lekker': {
    bg: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
    fg: '#FFFFFF',
    accent: '#DDD6FE',
    monogram: 'LK',
    sublabel: 'LEKKER',
  },
  'porto-vanila': {
    bg: 'linear-gradient(135deg, #B45309 0%, #78350F 100%)',
    fg: '#FEF3C7',
    accent: '#FDE68A',
    monogram: 'PV',
    sublabel: 'VANILA',
  },
  freddo: {
    bg: 'linear-gradient(135deg, #1E3A8A 0%, #172554 100%)',
    fg: '#FFFFFF',
    accent: '#93C5FD',
    monogram: 'FR',
    sublabel: 'FREDDO',
  },
  'las-delicias': {
    bg: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
    fg: '#FFFFFF',
    accent: '#FECDD3',
    monogram: 'LD',
    sublabel: 'DELICIAS',
  },
  luccianos: {
    bg: 'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
    fg: '#F8FAFC',
    accent: '#38BDF8',
    monogram: "L's",
    sublabel: 'LUCCIANOS',
  },
  'la-cigale': {
    bg: 'linear-gradient(135deg, #991B1B 0%, #450A0A 100%)',
    fg: '#FEF2F2',
    accent: '#FCA5A5',
    monogram: 'LC',
    sublabel: 'LA CIGALE',
  },

  // Moda y Calzado
  indian: {
    bg: 'linear-gradient(135deg, #18181B 0%, #27272A 100%)',
    fg: '#FAFAFA',
    accent: '#E4E4E7',
    monogram: 'IND',
    sublabel: 'INDIAN',
  },
  lemon: {
    bg: 'linear-gradient(135deg, #CA8A04 0%, #A16207 100%)',
    fg: '#FEFCE8',
    accent: '#FEF08A',
    monogram: 'LMN',
    sublabel: 'LEMON',
  },
  stadium: {
    bg: 'linear-gradient(135deg, #0369A1 0%, #075985 100%)',
    fg: '#FFFFFF',
    accent: '#38BDF8',
    monogram: 'STD',
    sublabel: 'STADIUM',
  },
  levis: {
    bg: 'linear-gradient(135deg, #C41230 0%, #990E26 100%)',
    fg: '#FFFFFF',
    accent: '#FFFFFF',
    monogram: "LEVI'S",
    shape: 'pill',
  },
  'daniel-cassin': {
    bg: 'linear-gradient(135deg, #292524 0%, #1C1917 100%)',
    fg: '#F5F5F4',
    accent: '#D6D3D1',
    monogram: 'DC',
    sublabel: 'CASSIN',
  },
  toto: {
    bg: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
    fg: '#FFFFFF',
    accent: '#FCA5A5',
    monogram: 'TOTO',
  },
  'optica-florida': {
    bg: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    fg: '#FFFFFF',
    accent: '#BAE6FD',
    monogram: 'ÓF',
    sublabel: 'FLORIDA',
  },
  'hush-puppies': {
    bg: 'linear-gradient(135deg, #78350F 0%, #451A03 100%)',
    fg: '#FEF3C7',
    accent: '#F59E0B',
    monogram: 'HP',
    sublabel: 'HUSH',
  },
  columbia: {
    bg: 'linear-gradient(135deg, #004687 0%, #002F5F 100%)',
    fg: '#FFFFFF',
    accent: '#7DD3FC',
    monogram: 'COL',
    sublabel: 'COLUMBIA',
    shape: 'diamond',
  },
  'the-north-face': {
    bg: 'linear-gradient(135deg, #DC2626 0%, #111827 100%)',
    fg: '#FFFFFF',
    accent: '#FFFFFF',
    monogram: 'TNF',
    sublabel: 'NORTH',
  },
  rotunda: {
    bg: 'linear-gradient(135deg, #1C1917 0%, #0C0A09 100%)',
    fg: '#FAFAF9',
    accent: '#A8A29E',
    monogram: 'RTD',
    sublabel: 'ROTUNDA',
  },
  lacoste: {
    bg: 'linear-gradient(135deg, #004D26 0%, #003319 100%)',
    fg: '#FFFFFF',
    accent: '#86EFAC',
    monogram: 'LAC',
    sublabel: 'LACOSTE',
  },
  'new-balance': {
    bg: 'linear-gradient(135deg, #CF0A2C 0%, #990720 100%)',
    fg: '#FFFFFF',
    accent: '#FECDD3',
    monogram: 'NB',
    sublabel: 'BALANCE',
  },
  'don-baez': {
    bg: 'linear-gradient(135deg, #92400E 0%, #78350F 100%)',
    fg: '#FEF3C7',
    accent: '#FDE68A',
    monogram: 'DB',
    sublabel: 'DON BAEZ',
  },
  skechers: {
    bg: 'linear-gradient(135deg, #0054A6 0%, #003B75 100%)',
    fg: '#FFFFFF',
    accent: '#93C5FD',
    monogram: 'SKX',
    sublabel: 'SKECHERS',
  },

  // Hogar y Tecnología
  'universo-binario': {
    bg: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
    fg: '#FFFFFF',
    accent: '#60A5FA',
    monogram: 'UB',
    sublabel: 'BINARIO',
  },
  arredo: {
    bg: 'linear-gradient(135deg, #B45309 0%, #92400E 100%)',
    fg: '#FFFBEB',
    accent: '#FDE68A',
    monogram: 'ARR',
    sublabel: 'ARREDO',
  },
  mundomac: {
    bg: 'linear-gradient(135deg, #334155 0%, #0F172A 100%)',
    fg: '#F8FAFC',
    accent: '#94A3B8',
    monogram: 'Mac',
    sublabel: 'MUNDOMAC',
  },
  iplace: {
    bg: 'linear-gradient(135deg, #1E293B 0%, #090D16 100%)',
    fg: '#FFFFFF',
    accent: '#38BDF8',
    monogram: 'iP',
    sublabel: 'iPLACE',
  },
  'samsung-store': {
    bg: 'linear-gradient(135deg, #1428A0 0%, #0B1760 100%)',
    fg: '#FFFFFF',
    accent: '#93C5FD',
    monogram: 'SAM',
    sublabel: 'SAMSUNG',
  },

  // Librerías y Jugueterías
  mosca: {
    bg: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
    fg: '#FFFFFF',
    accent: '#FDE047',
    monogram: 'M',
    sublabel: 'MOSCA',
  },
  bookshop: {
    bg: 'linear-gradient(135deg, #0F766E 0%, #115E59 100%)',
    fg: '#F0FDFA',
    accent: '#5EEAD4',
    monogram: 'BK',
    sublabel: 'BOOKSHOP',
  },
  'escaramuza-libreria': {
    bg: 'linear-gradient(135deg, #9A3412 0%, #7C2D12 100%)',
    fg: '#FFEDD5',
    accent: '#FDBA74',
    monogram: 'ESC',
    sublabel: 'LIBRERÍA',
  },
  'la-libreria-dbd': {
    bg: 'linear-gradient(135deg, #4338CA 0%, #3730A3 100%)',
    fg: '#EEF2FF',
    accent: '#A5B4FC',
    monogram: 'LL',
    sublabel: 'LIBRERÍA',
  },
  'puro-verso': {
    bg: 'linear-gradient(135deg, #7C2D12 0%, #431407 100%)',
    fg: '#FEF3C7',
    accent: '#F59E0B',
    monogram: 'PV',
    sublabel: 'PURO VERSO',
  },

  // Cines y Shows
  movie: {
    bg: 'linear-gradient(135deg, #9333EA 0%, #6B21A8 100%)',
    fg: '#FFFFFF',
    accent: '#F472B6',
    monogram: 'MOV',
    sublabel: 'MOVIE',
  },
  'life-cinemas': {
    bg: 'linear-gradient(135deg, #E11D48 0%, #9F1239 100%)',
    fg: '#FFFFFF',
    accent: '#FDA4AF',
    monogram: 'LIFE',
    sublabel: 'CINEMAS',
  },
  cinemateca: {
    bg: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
    fg: '#F8FAFC',
    accent: '#FBBF24',
    monogram: 'CMT',
    sublabel: 'CINE',
  },
  sodre: {
    bg: 'linear-gradient(135deg, #881337 0%, #4C0519 100%)',
    fg: '#FFE4E6',
    accent: '#FBBF24',
    monogram: 'SDR',
    sublabel: 'SODRE',
  },
  grupocine: {
    bg: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    fg: '#FFFFFF',
    accent: '#FACC15',
    monogram: 'GC',
    sublabel: 'CINE',
  },

  // Viajes y Movilidad
  cabify: {
    bg: 'linear-gradient(135deg, #7145D6 0%, #5829B8 100%)',
    fg: '#FFFFFF',
    accent: '#DDD6FE',
    monogram: 'CAB',
    sublabel: 'CABIFY',
  },
  buquebus: {
    bg: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    fg: '#FFFFFF',
    accent: '#FDE047',
    monogram: 'BQB',
    sublabel: 'BUQUEBUS',
  },
};

const CATEGORY_FALLBACK_STYLE: Record<CategoryId, { bg: string; fg: string; accent: string }> = {
  Todos: { bg: 'linear-gradient(135deg, #334155, #1E293B)', fg: '#FFFFFF', accent: '#38BDF8' },
  Favoritos: { bg: 'linear-gradient(135deg, #D97706, #B45309)', fg: '#FFFFFF', accent: '#FDE68A' },
  Supermercados: { bg: 'linear-gradient(135deg, #0284C7, #0369A1)', fg: '#FFFFFF', accent: '#7DD3FC' },
  Farmacias: { bg: 'linear-gradient(135deg, #0D9488, #0F766E)', fg: '#FFFFFF', accent: '#5EEAD4' },
  Combustible: { bg: 'linear-gradient(135deg, #003893, #002366)', fg: '#FCD116', accent: '#E11D48' },
  Gastronomía: { bg: 'linear-gradient(135deg, #B45309, #78350F)', fg: '#FEF3C7', accent: '#FBBF24' },
  'Cafés y Fast Food': { bg: 'linear-gradient(135deg, #EA580C, #C2410C)', fg: '#FFFFFF', accent: '#FED7AA' },
  'Moda y Calzado': { bg: 'linear-gradient(135deg, #4F46E5, #3730A3)', fg: '#FFFFFF', accent: '#C7D2FE' },
  'Hogar y Tecnología': { bg: 'linear-gradient(135deg, #2563EB, #1D4ED8)', fg: '#FFFFFF', accent: '#93C5FD' },
  'Librerías y Jugueterías': { bg: 'linear-gradient(135deg, #D97706, #92400E)', fg: '#FFFBEB', accent: '#FDE68A' },
  'Cines y Shows': { bg: 'linear-gradient(135deg, #9333EA, #6B21A8)', fg: '#FFFFFF', accent: '#F472B6' },
  'Viajes y Movilidad': { bg: 'linear-gradient(135deg, #0284C7, #0369A1)', fg: '#FFFFFF', accent: '#7DD3FC' },
};

function getInitials(name: string): string {
  const clean = name.replace(/\(.*?\)/g, '').trim();
  const words = clean.split(/\s+/).filter((w) => !['de', 'del', 'la', 'el', 'las', 'los', 'y', '&'].includes(w.toLowerCase()));
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase();
}

export function MerchantLogo({
  merchantId,
  merchantName,
  category,
  size = 'md',
}: {
  merchantId: string;
  merchantName: string;
  category: CategoryId;
  size?: 'sm' | 'md' | 'lg';
}) {
  const spec = MERCHANT_BRAND_MAP[merchantId];
  const fallback = CATEGORY_FALLBACK_STYLE[category] ?? CATEGORY_FALLBACK_STYLE.Todos;
  const bg = spec?.bg ?? fallback.bg;
  const fg = spec?.fg ?? fallback.fg;
  const accent = spec?.accent ?? fallback.accent;
  const monogram = spec?.monogram ?? getInitials(merchantName);
  const sublabel = spec?.sublabel;

  const sizeClass =
    size === 'sm'
      ? 'w-10 h-10 rounded-xl'
      : size === 'lg'
        ? 'w-14 h-14 rounded-2xl'
        : 'w-12 h-12 sm:w-13 sm:h-13 rounded-2xl';

  const textSizeClass =
    monogram.length >= 5
      ? 'text-[10px] sm:text-[11px]'
      : monogram.length === 4
        ? 'text-xs'
        : 'text-sm sm:text-base';

  return (
    <div
      className={`${sizeClass} relative shrink-0 flex flex-col items-center justify-center overflow-hidden shadow-md border border-white/20 select-none`}
      style={{ background: bg, color: fg }}
      aria-hidden="true"
    >
      {/* Brillo superior estilo ícono de app */}
      <div
        className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0) 100%)',
        }}
      />

      {/* Acento geométrico de marca */}
      {spec?.shape === 'cross' && (
        <span
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
          style={{ backgroundColor: accent }}
        />
      )}
      {spec?.shape === 'shield' && (
        <span
          className="absolute bottom-0 inset-x-0 h-1"
          style={{ backgroundColor: accent }}
        />
      )}

      <span className={`font-display font-extrabold tracking-tight leading-none relative z-10 ${textSizeClass}`}>
        {monogram}
      </span>

      {sublabel && size !== 'sm' && (
        <span
          className="font-sans font-bold text-[7px] tracking-wider uppercase leading-none mt-0.5 opacity-90 relative z-10 truncate max-w-[90%]"
          style={{ color: accent }}
        >
          {sublabel}
        </span>
      )}
    </div>
  );
}

export const BANK_FRIENDLY_SHORT: Record<IssuerId, string> = {
  itau: 'Itaú',
  brou: 'BROU',
  santander: 'Santander',
  scotiabank: 'Scotiabank',
  bbva: 'BBVA',
  prex: 'Prex',
  oca: 'OCA',
  hsbc: 'HSBC',
  heritage: 'Heritage',
  creditel: 'Creditel',
  anda: 'ANDA',
  midinero: 'MiDinero',
  mercadopago: 'Mercado Pago',
};
