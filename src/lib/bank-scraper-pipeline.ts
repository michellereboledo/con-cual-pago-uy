// bank-scraper-pipeline.ts — Zero-Fake Discounts Engine (Playwright + Schema Validator + Edge/Node Live Probe)
import { LiveVerificationStatus } from './engine';

export interface VerifiedCardTier {
  cardId: string;
  cardType: 'CREDITO' | 'DEBITO' | 'PREPAGA';
  discountPct: number;
  capPerPurchaseUYU: number | null;
  requiresSpecificPaymentApp: string | null;
}

export interface VerifiedDiscountRecord {
  merchantName: string;
  bank:
    | 'ITAU'
    | 'SANTANDER'
    | 'BROU'
    | 'SCOTIABANK'
    | 'BBVA'
    | 'OCA'
    | 'PREX'
    | 'CREDITEL'
    | 'ANDA'
    | 'MIDINERO'
    | 'MERCADOPAGO'
    | 'HSBC'
    | 'HERITAGE';
  cardTiers: VerifiedCardTier[];
  validDaysOfWeek: ('lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom')[];
  validUntilISO: string;
  allowedDepartments: string[];
  sourceCatalogUrl: string;
  legalTextHash: string;
}

export interface LiveProbeResponse {
  status: LiveVerificationStatus;
  hashPrefix: string;
  httpStatus?: number;
  latencyMs?: number;
  checkedAtISO?: string;
  liveBytes?: number;
}
