/**
 * multimodal-llm-parser.ts — Capa de Procesamiento Multimodal con "Smart Quota Guard" ($0 Costo)
 * usando Gemini 2.5 Flash / 1.5 Flash Free Tier + Structured Outputs (`responseSchema`).
 *
 * Reglas del Smart Quota Guard (100% Free Tier Google AI Studio):
 * 1. Prioridad Determinista ($0 tokens): Si el parser XHR/JSON/XML/DOM ya extrajo porcentaje
 *    y tarjetas válidas con evidencia textual, NO se invoca a Gemini (0 llamadas gastadas).
 * 2. Fallback Multimodal Quirúrgico: Solo se llama a Gemini cuando a un comercio le faltan
 *    datos críticos (porcentaje, tarjetas o tope) incrustados en un banner imagen o PDF legal.
 * 3. Caché Persistente por Hash (`public/llm-extraction-cache.json`): Antes de enviar un banner
 *    o PDF a Gemini, se calcula su clave canónica `SHA-256(sourceUrl + contentSha256 + assets)`.
 *    Si ya existe en caché, se reutiliza instantáneamente sin gastar cuota.
 * 4. Rate Limiter Estricto Free Tier: Delay mínimo de 4.500 ms entre llamadas (máx ~12 RPM,
 *    bajo el límite gratuito de 15 RPM) y tope duro `MAX_LLM_CALLS_PER_RUN = 40`.
 */

import {
  GEMINI_DISCOUNT_EXTRACTION_SCHEMA,
  MultimodalRawPayload,
  NormalizedLLMDiscountItem,
} from './schema';

export interface SmartQuotaGuardState {
  maxCallsPerRun: number;
  minDelayMs: number;
  callsExecutedThisRun: number;
  cacheHitsThisRun: number;
  deterministicBypassCount: number;
  quotaExhaustedSkips: number;
  lastCallTimestampMs: number;
  cacheEntries: Record<
    string,
    {
      cacheKey: string;
      sourceUrl: string;
      contentSha256: string;
      cachedAtISO: string;
      modelUsed: string;
      items: NormalizedLLMDiscountItem[];
    }
  >;
}

export interface GeminiMultimodalConfig {
  apiKey: string;
  model?: 'gemini-2.5-flash' | 'gemini-1.5-flash';
  maxCallsPerRun?: number;
  minDelayMs?: number;
  timeoutMs?: number;
}

export const DEFAULT_MAX_LLM_CALLS_PER_RUN = 40;
export const DEFAULT_MIN_LLM_DELAY_MS = 4500; // 4.5s -> máx 13.3 RPM (bajo el límite Free Tier de 15 RPM)

const SYSTEM_INSTRUCTION_UY = `Eres un Auditor Financiero y Extractor Multimodal de Beneficios Bancarios en Uruguay (Itaú, BBVA, Santander, BROU, Scotiabank, OCA, Prex, Creditel).
Tu objetivo es analizar el contenido crudo de una página o API oficial bancaria (HTML/DOM, JSON interceptado, imágenes de banners promocionales y PDFs de Bases y Condiciones) y devolver EXCLUSIVAMENTE un JSON estructurado según el schema provisto.

REGLAS ESTRICTAS (ZERO-FAKE POLICY):
1. JAMÁS inventes porcentajes, topes ni tarjetas. Si el porcentaje no figura explícitamente en el HTML, JSON, imagen del banner o PDF legal, NO devuelvas ese beneficio.
2. Si un mismo comercio tiene varios tramos según el nivel de tarjeta (ej. BBVA 20% con Crédito Internacional/Oro y 30% con Platinum/Black/Infinite, o Itaú 15% Crédito general, 20% Platinum y 25% Personal Bank/Black), genera UN elemento separado en 'beneficios_extraidos' por cada tramo de tarjeta.
3. Mapea siempre los IDs de tarjetas al catálogo normalizado:
   - ITAU: ["itau-volar-credito", "itau-gold", "itau-platinum", "itau-black", "itau-personal-bank", "itau-debito-volar"]
   - BBVA: ["bbva-debito", "bbva-credito", "bbva-gold", "bbva-platinum", "bbva-platinum-black"]
   - SANTANDER: ["santander-debito", "santander-credito", "santander-gold", "santander-platinum", "santander-select"]
   - BROU: ["brou-recompensa", "brou-debito", "brou-credito-clasica", "brou-gold"]
   - SCOTIABANK: ["scotiabank-debito", "scotiabank-credito", "scotiabank-gold", "scotiabank-platinum"]
   - OCA: ["oca-credito", "oca-blue", "oca-mastercard-black"]
4. En 'tope_reintegro', si el banco no menciona ningún tope en la página ni en el PDF, usa monto_uyu: null y periodo: "no_publicado". Solo usa periodo: "sin_tope" si el texto dice literalmente "sin tope".
5. En 'aplica_ley_19210_iva', marca true si la categoría es "Gastronomía" o "Cafés y Fast Food" en Uruguay (9 puntos de devolución de IVA Ley 19.210).
6. En 'evidencia_textual_exacta', copia la frase literal exacta del documento o banner donde consta el porcentaje y las tarjetas.`;

/**
 * Evalúa si un comercio necesita fallback quirúrgico a Gemini Multimodal
 * (Retorna false si el extractor determinista ya obtuvo porcentaje y tarjetas válidas -> $0 costo).
 */
export function needsSurgicalMultimodalFallback(
  deterministicItems: NormalizedLLMDiscountItem[],
  payload: MultimodalRawPayload
): boolean {
  if (
    deterministicItems.length > 0 &&
    deterministicItems.every(
      (item) =>
        item.porcentaje_descuento > 0 &&
        item.tarjetas_validas.length > 0 &&
        item.evidencia_textual_exacta.length > 5
    )
  ) {
    return false;
  }
  const hasMultimodalAssets = payload.bannerImages.length > 0 || payload.legalPdfs.length > 0;
  const hasUnstructuredPromoHint = /descuento|beneficio|off|ahorro|2x1|cuotas/i.test(payload.domCleanText);
  return hasMultimodalAssets || hasUnstructuredPromoHint;
}

/**
 * Calcula la clave canónica de caché para `public/llm-extraction-cache.json`
 */
export function computeMultimodalCacheKey(payload: MultimodalRawPayload): string {
  const assetRefs = [
    payload.sourceUrl,
    payload.contentSha256,
    ...payload.bannerImages.map((b) => b.imageUrl),
    ...payload.legalPdfs.map((p) => p.pdfUrl),
  ].join('|');
  return assetRefs;
}

/**
 * Ejecuta la extracción multimodal protegida por el Smart Quota Guard
 */
export async function extractWithSmartQuotaGuard(
  payload: MultimodalRawPayload,
  deterministicItems: NormalizedLLMDiscountItem[],
  quotaState: SmartQuotaGuardState,
  config: GeminiMultimodalConfig
): Promise<NormalizedLLMDiscountItem[]> {
  // 1. Prioridad Determinista ($0 tokens)
  if (!needsSurgicalMultimodalFallback(deterministicItems, payload)) {
    quotaState.deterministicBypassCount++;
    return deterministicItems;
  }

  // 2. Consulta al Caché Local por Hash (`public/llm-extraction-cache.json`)
  const cacheKey = computeMultimodalCacheKey(payload);
  const cached = quotaState.cacheEntries[cacheKey] || quotaState.cacheEntries[payload.sourceUrl];
  if (cached && cached.contentSha256 === payload.contentSha256) {
    quotaState.cacheHitsThisRun++;
    return cached.items;
  }

  // 3. Verificación de API Key y Tope Máximo por Corrida (`MAX_LLM_CALLS_PER_RUN = 40`)
  if (
    !config.apiKey ||
    config.apiKey === 'YOUR_GOOGLE_AI_STUDIO_FREE_API_KEY' ||
    quotaState.callsExecutedThisRun >= quotaState.maxCallsPerRun
  ) {
    quotaState.quotaExhaustedSkips++;
    return deterministicItems;
  }

  // 4. Rate Limiter del Free Tier (mínimo 4.5s entre llamadas -> máx 12 RPM)
  const nowMs = Date.now();
  const elapsedMs = nowMs - quotaState.lastCallTimestampMs;
  if (quotaState.lastCallTimestampMs > 0 && elapsedMs < quotaState.minDelayMs) {
    const waitMs = quotaState.minDelayMs - elapsedMs;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  quotaState.lastCallTimestampMs = Date.now();
  quotaState.callsExecutedThisRun++;

  const extracted = await extractWithGeminiMultimodal(payload, config);
  quotaState.cacheEntries[payload.sourceUrl] = {
    cacheKey,
    sourceUrl: payload.sourceUrl,
    contentSha256: payload.contentSha256,
    cachedAtISO: new Date().toISOString(),
    modelUsed: config.model || 'gemini-2.5-flash',
    items: extracted,
  };

  return extracted;
}

/**
 * Llamada directa a la API de Gemini (con fallback automático de `gemini-2.5-flash` a `gemini-1.5-flash`)
 */
export async function extractWithGeminiMultimodal(
  payload: MultimodalRawPayload,
  config: GeminiMultimodalConfig
): Promise<NormalizedLLMDiscountItem[]> {
  const modelsToTry: Array<'gemini-2.5-flash' | 'gemini-1.5-flash'> = config.model
    ? [config.model, 'gemini-1.5-flash']
    : ['gemini-2.5-flash', 'gemini-1.5-flash'];

  const parts: Array<Record<string, unknown>> = [
    {
      text: [
        `=== CONTEXTO DE EXTRACCIÓN MULTIMODAL ===`,
        `Banco Objetivo: ${payload.bank}`,
        `URL Fuente: ${payload.sourceUrl}`,
        `Categoría Detectada: ${payload.categoryHint || 'Auto-detectar'}`,
        `Título del Documento: ${payload.domTitle}`,
        ``,
        `=== 1. CONTENIDO DOM / HTML LIMPIO ===`,
        payload.domCleanText.slice(0, 24000),
        ``,
        payload.interceptedXhrPayloads.length > 0
          ? `=== 2. RESPUESTAS DE RED INTERCEPTADAS (XHR / FETCH JSON) ===\n` +
            payload.interceptedXhrPayloads
              .map((x) => `[Endpoint: ${x.endpointUrl}]\n${x.jsonSnippet.slice(0, 8000)}`)
              .join('\n\n')
          : '',
        payload.legalPdfs.length > 0
          ? `=== 3. TEXTO DE BASES Y CONDICIONES (PDF LEGAL) ===\n` +
            payload.legalPdfs
              .map((p) => `[PDF: ${p.pdfUrl} (${p.anchorText})]\n${(p.extractedPdfText || '').slice(0, 12000)}`)
              .join('\n\n')
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    },
  ];

  for (const img of payload.bannerImages.slice(0, 4)) {
    if (img.base64Data) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64Data,
        },
      });
      parts.push({
        text: `[Banner Promocional Adjunto: ${img.imageUrl} | alt="${img.altText}"] Extrae cualquier porcentaje (% OFF, 2x1), días de la semana, tope o tarjetas visibles en la imagen.`,
      });
    }
  }

  for (const pdf of payload.legalPdfs.slice(0, 2)) {
    if (pdf.base64Data) {
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdf.base64Data,
        },
      });
      parts.push({
        text: `[PDF Bases y Condiciones Adjunto: ${pdf.pdfUrl}] Extrae topes de reintegro ($U por cuenta/mes/compra), vigencia exacta, tarjetas incluidas y exclusiones.`,
      });
    }
  }

  let lastError: Error | null = null;
  for (const model of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        config.apiKey
      )}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(config.timeoutMs || 45000),
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION_UY }],
          },
          contents: [
            {
              role: 'user',
              parts,
            },
          ],
          generationConfig: {
            temperature: 0.0,
            responseMimeType: 'application/json',
            responseSchema: GEMINI_DISCOUNT_EXTRACTION_SCHEMA,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`Gemini (${model}) HTTP ${response.status}: ${errText.slice(0, 240)}`);
        continue;
      }

      const data = await response.json();
      const rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJsonText) return [];

      const parsed = JSON.parse(rawJsonText) as {
        beneficios_extraidos?: NormalizedLLMDiscountItem[];
      };

      return (parsed.beneficios_extraidos || []).filter(
        (item) =>
          item.porcentaje_descuento > 0 &&
          item.porcentaje_descuento <= 100 &&
          item.tarjetas_validas.length > 0 &&
          item.evidencia_textual_exacta.trim().length > 5
      );
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (lastError) {
    throw lastError;
  }
  return [];
}
