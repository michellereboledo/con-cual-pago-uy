/**
 * live-catalog-sync.ts — Motor de Actualización Over-The-Air (OTA) 100% Costo Cero ($0)
 *
 * Permite que el APK instalado en Android y la PWA web reciban los nuevos descuentos
 * diarios generados por GitHub Actions (`public/deep-scrape-db.json`) sin recompilar ni
 * reinstalar la aplicación:
 *
 * 1. Carga Instantánea Offline (0ms): Arranca mostrando inmediatamente `MERCHANTS_DATA`
 *    o el último catálogo OTA persistido en `localStorage` bajo `ccp_live_catalog_v1`.
 * 2. Sync Silencioso en Background: Al montar la app, realiza un `fetch()` no bloqueante
 *    hacia `VITE_REMOTE_DB_URL` (GitHub Raw `public/deep-scrape-db.json`) con fallback
 *    automático a `/deep-scrape-db.json` y `http://127.0.0.1:4173/deep-scrape-db.json`.
 * 3. Hot-Swap React State: Si detecta un `updatedAtISO` o `syncRunId` más reciente,
 *    actualiza el estado de React en caliente y persiste en `localStorage`.
 */

import { useState, useEffect, useCallback } from 'react';
import { Merchant } from '../types/discount';
import { MERCHANTS_DATA, DATA_VERIFIED_AT } from '../data/merchantsData';

export const CCP_LIVE_CATALOG_STORAGE_KEY = 'ccp_live_catalog_v1';

export const DEFAULT_GITHUB_RAW_DB_URL =
  'https://raw.githubusercontent.com/michellereboledo/con-cual-pago-uy/main/public/deep-scrape-db.json';

export interface StoredOtaCatalogPayload {
  schemaVersion: string;
  updatedAtISO: string;
  syncRunId: string;
  totalRules: number;
  merchantsCatalog: Merchant[];
}

export interface LiveCatalogSyncState {
  merchants: Merchant[];
  updatedAtISO: string;
  otaStatus: 'OFFLINE_BUNDLED' | 'CACHED_OTA' | 'SYNCING' | 'UP_TO_DATE' | 'UPDATED_HOT';
  totalRulesCount: number;
  triggerManualOtaSync: () => Promise<void>;
}

function getConfiguredRemoteUrls(): string[] {
  const urls: string[] = [];
  try {
    const win = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {};
    if (typeof win.__VITE_REMOTE_DB_URL__ === 'string' && win.__VITE_REMOTE_DB_URL__) {
      urls.push(win.__VITE_REMOTE_DB_URL__);
    }
  } catch {}
  urls.push(
    DEFAULT_GITHUB_RAW_DB_URL,
    '/deep-scrape-db.json',
    'http://127.0.0.1:4173/deep-scrape-db.json'
  );
  return [...new Set(urls)];
}

/**
 * 1. Carga Instantánea Offline (0ms): Devuelve el catálogo más reciente entre
 *    el bundle local (`MERCHANTS_DATA`) y `localStorage['ccp_live_catalog_v1']`.
 */
export function loadInitialCatalog(): {
  merchants: Merchant[];
  updatedAtISO: string;
  source: 'OFFLINE_BUNDLED' | 'CACHED_OTA';
} {
  if (typeof window === 'undefined') {
    return { merchants: MERCHANTS_DATA, updatedAtISO: DATA_VERIFIED_AT, source: 'OFFLINE_BUNDLED' };
  }
  try {
    const raw = window.localStorage.getItem(CCP_LIVE_CATALOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredOtaCatalogPayload;
      if (
        Array.isArray(parsed.merchantsCatalog) &&
        parsed.merchantsCatalog.length >= MERCHANTS_DATA.length &&
        parsed.updatedAtISO >= DATA_VERIFIED_AT
      ) {
        return {
          merchants: parsed.merchantsCatalog,
          updatedAtISO: parsed.updatedAtISO,
          source: 'CACHED_OTA',
        };
      }
    }
  } catch {}
  return { merchants: MERCHANTS_DATA, updatedAtISO: DATA_VERIFIED_AT, source: 'OFFLINE_BUNDLED' };
}

/**
 * Reconstruye un catálogo `Merchant[]` si el JSON remoto solo trae `normalizedEntities`
 */
function hydrateMerchantsFromRemoteJson(data: Record<string, unknown>): Merchant[] | null {
  if (Array.isArray(data.merchantsCatalog) && data.merchantsCatalog.length > 0) {
    return data.merchantsCatalog as Merchant[];
  }
  return null;
}

/**
 * 2. Hook React de Sincronización Silenciosa Over-The-Air (OTA)
 */
export function useLiveCatalogSync(): LiveCatalogSyncState {
  const initial = loadInitialCatalog();
  const [merchants, setMerchants] = useState<Merchant[]>(initial.merchants);
  const [updatedAtISO, setUpdatedAtISO] = useState<string>(initial.updatedAtISO);
  const [otaStatus, setOtaStatus] = useState<LiveCatalogSyncState['otaStatus']>(initial.source);

  const performSilentSync = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const candidateUrls = getConfiguredRemoteUrls();

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) continue;

        const data = (await res.json()) as Record<string, unknown>;
        const remoteMerchants = hydrateMerchantsFromRemoteJson(data);
        if (!remoteMerchants || remoteMerchants.length === 0) continue;

        const telemetry = (data.telemetry || {}) as Record<string, unknown>;
        const remoteUpdatedISO =
          (typeof data.updatedAtISO === 'string' && data.updatedAtISO) ||
          (typeof telemetry.finishedAtISO === 'string' && telemetry.finishedAtISO) ||
          new Date().toISOString();
        const remoteSyncId =
          (typeof telemetry.syncRunId === 'string' && telemetry.syncRunId) || 'ota-sync';
        const remoteRulesCount = remoteMerchants.reduce(
          (acc, m) => acc + (Array.isArray(m.rules) ? m.rules.length : 0),
          0
        );
        const currentRulesCount = merchants.reduce(
          (acc, m) => acc + (Array.isArray(m.rules) ? m.rules.length : 0),
          0
        );

        const isNewer =
          remoteUpdatedISO > updatedAtISO ||
          remoteMerchants.length > merchants.length ||
          remoteRulesCount > currentRulesCount;

        const payloadToStore: StoredOtaCatalogPayload = {
          schemaVersion: '2.1.0-ota-zero-cost',
          updatedAtISO: remoteUpdatedISO,
          syncRunId: remoteSyncId,
          totalRules: remoteRulesCount,
          merchantsCatalog: remoteMerchants,
        };

        try {
          window.localStorage.setItem(CCP_LIVE_CATALOG_STORAGE_KEY, JSON.stringify(payloadToStore));
        } catch {}

        if (isNewer) {
          setMerchants(remoteMerchants);
          setUpdatedAtISO(remoteUpdatedISO);
          setOtaStatus('UPDATED_HOT');
        } else {
          setOtaStatus('UP_TO_DATE');
        }
        return;
      } catch {
        // Continúa silenciosamente con la siguiente URL de fallback sin bloquear la UI
      }
    }
  }, [merchants, updatedAtISO]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      performSilentSync();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [performSilentSync]);

  const totalRulesCount = merchants.reduce(
    (acc, m) => acc + (Array.isArray(m.rules) ? m.rules.length : 0),
    0
  );

  return {
    merchants,
    updatedAtISO,
    otaStatus,
    totalRulesCount,
    triggerManualOtaSync: performSilentSync,
  };
}
