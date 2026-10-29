/**
 * schema.ts — Modelo de Datos de Grado de Producción para el Motor de Deep Scraping
 * y Extracción Multimodal de Beneficios Bancarios (Uruguay)
 *
 * Incluye:
 * 1. Interfaces TypeScript normalizadas (Entidad de Ingesta LLM + Modelo Relacional).
 * 2. JSON Schema estricto (OpenAPI 3.0 / Gemini Structured Outputs `responseSchema`).
 * 3. Esquema SQL DDL (PostgreSQL 16 / SQLite WAL) con soporte para Upsert, Deduplicación,
 *    Evidencia Multimodal (HTML/OCR/PDF) y Monitoreo de Drift Estructural.
 */

export type NormalizedBankCode =
  | 'ITAU'
  | 'BBVA'
  | 'SANTANDER'
  | 'BROU'
  | 'SCOTIABANK'
  | 'OCA'
  | 'PREX'
  | 'CREDITEL'
  | 'MIDINERO'
  | 'HSBC'
  | 'HERITAGE'
  | 'ANDA';

export type NormalizedCategory =
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

export type NormalizedDay =
  | 'Lunes'
  | 'Martes'
  | 'Miércoles'
  | 'Jueves'
  | 'Viernes'
  | 'Sábado'
  | 'Domingo';

export type RefundModality = 'En el acto' | 'Estado de cuenta';
export type CapPeriodType = 'transaccion' | 'dia' | 'mes' | 'cuenta' | 'sin_tope' | 'no_publicado';

/**
 * Estructura exacta devuelta por el LLM con Structured Outputs (JSON Schema estricto)
 * por cada beneficio/tramo de tarjeta detectado en HTML + Vision OCR + PDF Legal.
 */
export interface NormalizedLLMDiscountItem {
  banco: NormalizedBankCode;
  comercio: string;
  subtitulo_rubro: string;
  categoria: NormalizedCategory;
  porcentaje_descuento: number;
  tarjetas_validas: string[];
  dias_aplicacion: NormalizedDay[];
  tope_reintegro: {
    monto_uyu: number | null;
    periodo: CapPeriodType;
    texto_original: string | null;
  };
  modalidad_reintegro: RefundModality;
  vigencia_desde: string | null; // ISO YYYY-MM-DD
  vigencia_hasta: string | null; // ISO YYYY-MM-DD
  condiciones_especiales: string;
  exclusiones: string[]; // ej. ["Mercado Pago", "POS Handy", "PedidosYa"]
  departamentos_validos: string[]; // ej. ["Montevideo", "Maldonado", "Todo el país"]
  canales_validos: ('Presencial' | 'Online' | 'App')[];
  aplica_ley_19210_iva: boolean;
  url_fuente: string;
  evidencia_textual_exacta: string;
  fuente_extraccion: ('DOM_HTML' | 'XHR_JSON' | 'VISION_BANNER_OCR' | 'PDF_BASES_LEGALES')[];
}

/**
 * Payload Multimodal recolectado por el Deep Crawler antes de pasar al LLM / Extractor
 */
export interface MultimodalRawPayload {
  bank: NormalizedBankCode;
  sourceUrl: string;
  discoveredFromUrl: string;
  categoryHint?: string;
  httpStatus: number;
  domTitle: string;
  domCleanText: string;
  interceptedXhrPayloads: Array<{
    endpointUrl: string;
    contentType: string;
    jsonSnippet: string;
  }>;
  bannerImages: Array<{
    imageUrl: string;
    altText: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    base64Data?: string;
    ocrExtractedText?: string;
  }>;
  legalPdfs: Array<{
    pdfUrl: string;
    anchorText: string;
    base64Data?: string;
    extractedPdfText?: string;
  }>;
  contentSha256: string;
  fetchedAtISO: string;
}

/**
 * Resultado de sincronización continua (Live Sync Upsert & Deduplicación)
 */
export interface LiveSyncTelemetry {
  syncRunId: string;
  startedAtISO: string;
  finishedAtISO: string;
  durationMs: number;
  banksProcessed: NormalizedBankCode[];
  pagesCrawled: number;
  xhrEndpointsIntercepted: number;
  bannersInspected: number;
  pdfsInspected: number;
  totalMerchantsActive: number;
  totalRulesActive: number;
  upsertedNewRules: number;
  updatedExistingRules: number;
  deactivatedExpiredOrMissingRules: number;
  structuralDriftAlerts: Array<{
    bank: NormalizedBankCode;
    url: string;
    reason: string;
    previousRuleCount: number;
    currentRuleCount: number;
  }>;
}

/**
 * JSON Schema Estricto para Gemini 2.5 Flash / 1.5 Pro Structured Outputs
 * (`generationConfig.responseSchema`)
 */
export const GEMINI_DISCOUNT_EXTRACTION_SCHEMA = {
  type: 'OBJECT',
  required: ['beneficios_extraidos'],
  properties: {
    beneficios_extraidos: {
      type: 'ARRAY',
      description:
        'Lista exhaustiva de beneficios y tramos de descuento extraídos del HTML, JSON interceptado, imágenes de banners (OCR) y PDFs de bases y condiciones.',
      items: {
        type: 'OBJECT',
        required: [
          'banco',
          'comercio',
          'subtitulo_rubro',
          'categoria',
          'porcentaje_descuento',
          'tarjetas_validas',
          'dias_aplicacion',
          'tope_reintegro',
          'modalidad_reintegro',
          'vigencia_desde',
          'vigencia_hasta',
          'condiciones_especiales',
          'exclusiones',
          'departamentos_validos',
          'canales_validos',
          'aplica_ley_19210_iva',
          'url_fuente',
          'evidencia_textual_exacta',
          'fuente_extraccion',
        ],
        properties: {
          banco: {
            type: 'STRING',
            enum: [
              'ITAU',
              'BBVA',
              'SANTANDER',
              'BROU',
              'SCOTIABANK',
              'OCA',
              'PREX',
              'CREDITEL',
              'MIDINERO',
            ],
          },
          comercio: {
            type: 'STRING',
            description: 'Nombre comercial limpio del negocio en Uruguay (ej. "Tienda Inglesa", "Xiaomi Uruguay").',
          },
          subtitulo_rubro: {
            type: 'STRING',
            description: 'Descripción breve del giro del comercio (ej. "Restaurante y parrilla", "Tecnología y smartphones").',
          },
          categoria: {
            type: 'STRING',
            enum: [
              'Gastronomía',
              'Cafés y Fast Food',
              'Supermercados',
              'Farmacias',
              'Combustible',
              'Moda y Calzado',
              'Hogar y Tecnología',
              'Librerías y Jugueterías',
              'Cines y Shows',
              'Viajes y Movilidad',
            ],
          },
          porcentaje_descuento: {
            type: 'INTEGER',
            description: 'Porcentaje numérico entero de descuento (ej. 15, 20, 25, 30, o 50 para 2x1).',
          },
          tarjetas_validas: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description:
              'IDs normalizados de las tarjetas que aplican a este tramo (ej. ["bbva-credito", "bbva-gold"] o ["bbva-platinum", "bbva-platinum-black"]).',
          },
          dias_aplicacion: {
            type: 'ARRAY',
            items: {
              type: 'STRING',
              enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
            },
          },
          tope_reintegro: {
            type: 'OBJECT',
            required: ['monto_uyu', 'periodo', 'texto_original'],
            properties: {
              monto_uyu: {
                type: 'INTEGER',
                nullable: true,
                description: 'Monto máximo de devolución en pesos uruguayos ($U), o null si no tiene tope / no está publicado.',
              },
              periodo: {
                type: 'STRING',
                enum: ['transaccion', 'dia', 'mes', 'cuenta', 'sin_tope', 'no_publicado'],
              },
              texto_original: {
                type: 'STRING',
                nullable: true,
              },
            },
          },
          modalidad_reintegro: {
            type: 'STRING',
            enum: ['En el acto', 'Estado de cuenta'],
          },
          vigencia_desde: {
            type: 'STRING',
            nullable: true,
            description: 'Fecha de inicio en formato ISO YYYY-MM-DD o null si no se especifica.',
          },
          vigencia_hasta: {
            type: 'STRING',
            nullable: true,
            description: 'Fecha de fin de vigencia en formato ISO YYYY-MM-DD.',
          },
          condiciones_especiales: {
            type: 'STRING',
            description: 'Resumen claro de las condiciones legales del beneficio.',
          },
          exclusiones: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
          departamentos_validos: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
          canales_validos: {
            type: 'ARRAY',
            items: {
              type: 'STRING',
              enum: ['Presencial', 'Online', 'App'],
            },
          },
          aplica_ley_19210_iva: {
            type: 'BOOLEAN',
          },
          url_fuente: {
            type: 'STRING',
          },
          evidencia_textual_exacta: {
            type: 'STRING',
            description: 'Cita literal extraída del HTML, imagen OCR o PDF que demuestra el porcentaje y las tarjetas.',
          },
          fuente_extraccion: {
            type: 'ARRAY',
            items: {
              type: 'STRING',
              enum: ['DOM_HTML', 'XHR_JSON', 'VISION_BANNER_OCR', 'PDF_BASES_LEGALES'],
            },
          },
        },
      },
    },
  },
} as const;

/**
 * Esquema SQL DDL de Producción (PostgreSQL 16+ / SQLite 3.45+)
 * Soporta deduplicación determinística (`rule_fingerprint`), versionado de cambios,
 * baja lógica automática (`is_active = FALSE`) y auditoría multimodal SHA-256.
 */
export const DATABASE_DDL_SQL = `
-- =============================================================================
-- ¿CON CUÁL PAGO? UY — ESQUEMA DE BASE DE DATOS VIVA (POSTGRESQL / SQLITE)
-- =============================================================================

CREATE TABLE IF NOT EXISTS issuers (
  id VARCHAR(32) PRIMARY KEY,              -- ej. 'itau', 'bbva', 'santander', 'brou', 'scotiabank', 'oca'
  code VARCHAR(32) NOT NULL UNIQUE,        -- ej. 'ITAU', 'BBVA'
  display_name VARCHAR(120) NOT NULL,
  portal_root_url TEXT NOT NULL,
  last_crawled_at TIMESTAMPTZ,
  structural_health_status VARCHAR(24) NOT NULL DEFAULT 'HEALTHY' -- 'HEALTHY' | 'DRIFT_WARNING' | 'BROKEN'
);

CREATE TABLE IF NOT EXISTS card_tiers (
  id VARCHAR(64) PRIMARY KEY,              -- ej. 'itau-personal-bank', 'bbva-platinum-black'
  issuer_id VARCHAR(32) NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
  tier_name VARCHAR(80) NOT NULL,          -- ej. 'Personal Bank / Black', 'Platinum / Infinite'
  card_type VARCHAR(16) NOT NULL CHECK (card_type IN ('Débito', 'Crédito', 'Prepaga')),
  network VARCHAR(32) DEFAULT 'Visa/Mastercard'
);

CREATE TABLE IF NOT EXISTS merchants (
  id VARCHAR(96) PRIMARY KEY,              -- slug canónico deduplicado, ej. 'tienda-inglesa', 'xiaomi-uruguay'
  canonical_name VARCHAR(160) NOT NULL,
  subtitle VARCHAR(240) NOT NULL,
  category VARCHAR(64) NOT NULL,
  applies_ley_19210 BOOLEAN NOT NULL DEFAULT FALSE,
  debit_iva_eligible BOOLEAN NOT NULL DEFAULT TRUE,
  location_hint VARCHAR(240) NOT NULL DEFAULT 'Montevideo',
  search_keywords_json JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discount_rules (
  id VARCHAR(140) PRIMARY KEY,             -- ej. 'xiaomi-uruguay-bbva-cred-15'
  rule_fingerprint CHAR(64) NOT NULL UNIQUE, -- SHA-256(merchant_id + issuer_id + sorted(card_ids) + pct + sorted(days))
  merchant_id VARCHAR(96) NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  issuer_id VARCHAR(32) NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
  percentage INTEGER NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  days_of_week_json JSONB NOT NULL,        -- ej. ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"]
  refund_type VARCHAR(32) NOT NULL CHECK (refund_type IN ('En el acto', 'Estado de cuenta')),
  max_cap_uyu INTEGER NULL,                -- NULL si sin tope o no publicado
  cap_period VARCHAR(24) NULL CHECK (cap_period IN ('transaccion', 'compra', 'dia', 'día', 'mes', 'cuenta')),
  cap_not_published BOOLEAN NOT NULL DEFAULT TRUE,
  min_purchase_uyu INTEGER NULL,
  installments INTEGER NULL,
  valid_from DATE NULL,
  valid_until DATE NULL,
  channel VARCHAR(32) NOT NULL DEFAULT 'Presencial',
  requires_payment_app VARCHAR(120) NULL,
  conditions_summary TEXT NOT NULL,
  exclusions_json JSONB NOT NULL DEFAULT '[]',
  allowed_departments_json JSONB NOT NULL DEFAULT '["Montevideo"]',
  source_catalog_url TEXT NOT NULL,
  legal_text_sha256 CHAR(64) NOT NULL,
  verbatim_evidence TEXT NOT NULL,
  extraction_modalities_json JSONB NOT NULL DEFAULT '["DOM_HTML"]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_run_id VARCHAR(64) NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rule_card_tiers (
  rule_id VARCHAR(140) NOT NULL REFERENCES discount_rules(id) ON DELETE CASCADE,
  card_tier_id VARCHAR(64) NOT NULL REFERENCES card_tiers(id) ON DELETE CASCADE,
  PRIMARY KEY (rule_id, card_tier_id)
);

CREATE TABLE IF NOT EXISTS multimodal_evidence_assets (
  asset_id VARCHAR(96) PRIMARY KEY,
  rule_id VARCHAR(140) NOT NULL REFERENCES discount_rules(id) ON DELETE CASCADE,
  modality VARCHAR(32) NOT NULL CHECK (modality IN ('DOM_HTML', 'XHR_JSON', 'VISION_BANNER_OCR', 'PDF_BASES_LEGALES')),
  asset_url TEXT NOT NULL,
  asset_sha256 CHAR(64) NOT NULL,
  extracted_raw_text TEXT NOT NULL,
  llm_model_version VARCHAR(64) NOT NULL DEFAULT 'gemini-2.5-flash',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scrape_sync_runs (
  run_id VARCHAR(64) PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NULL,
  status VARCHAR(24) NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'PARTIAL_DRIFT', 'FAILED')),
  pages_crawled INTEGER NOT NULL DEFAULT 0,
  banners_ocr_processed INTEGER NOT NULL DEFAULT 0,
  pdfs_parsed INTEGER NOT NULL DEFAULT 0,
  rules_inserted INTEGER NOT NULL DEFAULT 0,
  rules_updated INTEGER NOT NULL DEFAULT 0,
  rules_deactivated INTEGER NOT NULL DEFAULT 0,
  error_log_json JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_discount_rules_active_merchant ON discount_rules(merchant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_discount_rules_issuer_active ON discount_rules(issuer_id, is_active);
CREATE INDEX IF NOT EXISTS idx_discount_rules_valid_until ON discount_rules(valid_until) WHERE is_active = TRUE;
`;
