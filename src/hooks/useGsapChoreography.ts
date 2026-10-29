import { useEffect, useRef, useState } from 'react';

interface GsapInstance {
  to: (target: unknown, vars: Record<string, unknown>) => { kill?: () => void };
  fromTo: (
    target: unknown,
    fromVars: Record<string, unknown>,
    toVars: Record<string, unknown>
  ) => { kill?: () => void };
  matchMedia?: () => {
    add: (query: string, handler: () => void | (() => void)) => void;
    revert: () => void;
  };
}

function getGsap(): GsapInstance | null {
  if (typeof window === 'undefined') return null;
  const g = (window as unknown as { gsap?: GsapInstance }).gsap;
  return g && typeof g.to === 'function' ? g : null;
}

/**
 * GSAP matchMedia-aware animated integer counter for $U POS ticket readouts.
 * Falls back immediately during SSR or when prefers-reduced-motion is enabled.
 */
export function useAnimatedUYU(targetValue: number): number {
  const [displayValue, setDisplayValue] = useState<number>(targetValue);
  const proxyRef = useRef<{ val: number }>({ val: targetValue });

  useEffect(() => {
    const gsap = getGsap();
    if (!gsap) {
      proxyRef.current.val = targetValue;
      setDisplayValue(targetValue);
      return;
    }

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      proxyRef.current.val = targetValue;
      setDisplayValue(targetValue);
      return;
    }

    const tween = gsap.to(proxyRef.current, {
      val: targetValue,
      duration: 0.24,
      ease: 'power2.out',
      onUpdate: () => {
        setDisplayValue(Math.round(proxyRef.current.val));
      },
    });

    return () => {
      if (tween && typeof tween.kill === 'function') tween.kill();
    };
  }, [targetValue]);

  return displayValue;
}

/**
 * GSAP 3D ISO-7810 Card Fan spring entrance & focus choreography.
 */
export function useGsapCardFan(
  containerRef: { current: HTMLElement | null },
  depsKey: string
): void {
  useEffect(() => {
    const gsap = getGsap();
    const el = containerRef.current;
    if (!gsap || !el || !gsap.matchMedia) return;

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const cards = el.querySelectorAll('.iso-card');
      if (!cards.length) return;
      gsap.fromTo(
        cards,
        { opacity: 0.82, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.36,
          stagger: 0.04,
          ease: 'power3.out',
          overwrite: 'auto',
        }
      );
    });

    return () => {
      mm.revert();
    };
  }, [containerRef, depsKey]);
}
