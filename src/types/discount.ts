export type DayOfWeek =
  | 'Lunes'
  | 'Martes'
  | 'Miércoles'
  | 'Jueves'
  | 'Viernes'
  | 'Sábado'
  | 'Domingo';

export type MerchantCategory =
  | 'Gastronomía'
  | 'Cafés y Fast Food'
  | 'Supermercados'
  | 'Farmacias'
  | 'Combustible'
  | 'Moda y Calzado'
  | 'Hogar y Tecnología'
  | 'Librerías y Jugueterías'
  | 'Cines y Shows'
  | 'Viajes y Movilidad';

export type CategoryId = 'Todos' | 'Favoritos' | MerchantCategory;

export type IssuerId =
  | 'itau'
  | 'santander'
  | 'brou'
  | 'scotiabank'
  | 'bbva'
  | 'hsbc'
  | 'heritage'
  | 'prex'
  | 'mercadopago'
  | 'oca'
  | 'midinero'
  | 'creditel'
  | 'anda';

export type IssuerSection = 'Bancos' | 'Fintechs y Prepagas' | 'Emisoras de Crédito';

export type CardType = 'Débito' | 'Crédito' | 'Prepaga';

export type RefundType = 'En el acto' | 'Estado de cuenta';

/** Periodo sobre el que aplica el tope de devolución */
export type CapPeriod = 'compra' | 'día' | 'mes';

export type Channel = 'Presencial' | 'Online' | 'App' | 'Presencial y Online';

export interface Issuer {
  id: IssuerId;
  name: string;
  shortName: string;
  section: IssuerSection;
  brandColor: string;
  textColor: string;
  applyUrl: string;
}

export interface WalletCard {
  id: string;
  issuerId: IssuerId;
  issuerName: string;
  tierName: string;
  fullName: string;
  type: CardType;
  brandColor: string;
  textColor: string;
  annualSavingsEstimateUYU: number;
  affiliatePerks: string[];
}

export interface DiscountRule {
  id: string;
  cardIds: string[];
  percentage: number;
  days: DayOfWeek[];
  refundType: RefundType;
  maxCapUYU: number | null; // null = Sin tope de devolución
  capPeriod?: CapPeriod;
  /** Semanas del mes en que aplica (ej. [2, 4] = 2do y 4to miércoles) */
  weekOfMonth?: number[];
  minPurchaseUYU?: number;
  channel?: Channel;
  /** Cuotas sin recargo adicionales al descuento */
  installments?: number;
  /** ISO yyyy-mm-dd inclusive */
  validFrom?: string;
  /** ISO yyyy-mm-dd inclusive */
  validUntil?: string;
  /** Promos relámpago destacadas en Alertas Pro */
  isSuperDay?: boolean;
  conditions?: string;
  /** Zero-Fake Discounts Engine Metadata */
  requiresSpecificPaymentApp?: string | null;
  validUntilISO?: string;
  allowedDepartments?: string[];
  sourceCatalogUrl?: string;
  legalTextHash?: string;
  /** true si el banco no publica tope: la UI no debe afirmar "Sin tope" */
  capNotPublished?: boolean;
  /** Fragmento textual de la fuente oficial que respalda la regla (auditoría) */
  evidence?: string;
  /** ISO timestamp de la última verificación automática exitosa */
  verifiedAtISO?: string;
}

export interface Merchant {
  id: string;
  name: string;
  subtitle: string;
  category: MerchantCategory;
  searchKeywords: string[];
  appliesLey19210: boolean; // -9 pts IVA en Gastronomía
  /** false si el rubro no admite la rebaja de 2 pts de IVA por débito */
  debitIvaEligible?: boolean;
  isSponsored?: boolean;
  sponsoredPromoTag?: string;
  locationHint: string;
  rules: DiscountRule[];
}

export interface EvaluatedDiscount {
  rule: DiscountRule;
  card: WalletCard;
  isOwned: boolean;
}

export interface MerchantEvaluation {
  bestWalletMatch: EvaluatedDiscount | null;
  bestOverallMatch: EvaluatedDiscount | null;
  bestNonWalletMatch: EvaluatedDiscount | null;
  hasFomoUpsell: boolean;
  fomoDifferencePct: number;
  allActiveToday: EvaluatedDiscount[];
  walletMatches: EvaluatedDiscount[];
}
