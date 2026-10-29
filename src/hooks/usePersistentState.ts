import { Dispatch, SetStateAction, useEffect, useState } from 'react';

/**
 * useState sincronizado con localStorage.
 * `sanitize` valida/limpia el valor guardado (ej. ids de tarjetas que ya no existen).
 */
export function usePersistentState<T,>(
  key: string,
  initialValue: T,
  sanitize?: (raw: unknown) => T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) return initialValue;
      const parsed: unknown = JSON.parse(saved);
      return sanitize ? sanitize(parsed) : (parsed as T);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Modo privado o cuota excedida: seguimos en memoria
    }
  }, [key, value]);

  return [value, setValue];
}
