import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface SheetProps {
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
}

/** Stack of active modal close handlers for Android hardware Back button & Escape key. */
const activeSheetCloseStack: Array<() => void> = [];

if (typeof window !== 'undefined') {
  (window as unknown as { __handleAndroidBack?: () => boolean }).__handleAndroidBack = () => {
    const topClose = activeSheetCloseStack[activeSheetCloseStack.length - 1];
    if (topClose) {
      topClose();
      return true;
    }
    return false;
  };
}

/** PRISMA UY Optical Glass Modal / Bottom Sheet via Portal with transitions.dev & GSAP choreography. */
export function Sheet({ onClose, ariaLabel, children }: SheetProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeHandler = () => onCloseRef.current();
    activeSheetCloseStack.push(closeHandler);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeSheetCloseStack[activeSheetCloseStack.length - 1] === closeHandler) {
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const g = (window as unknown as { gsap?: { fromTo: (...args: unknown[]) => void; matchMedia?: () => { add: (q: string, fn: () => void) => void; revert: () => void } } }).gsap;
    const mm = g?.matchMedia ? g.matchMedia() : null;
    if (mm && panelRef.current) {
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        g!.fromTo(
          panelRef.current,
          { y: 14, scale: 0.96, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, duration: 0.25, ease: 'power3.out' }
        );
      });
    }

    return () => {
      const idx = activeSheetCloseStack.lastIndexOf(closeHandler);
      if (idx !== -1) activeSheetCloseStack.splice(idx, 1);
      if (mm) mm.revert();
      document.removeEventListener('keydown', onKey);
      if (activeSheetCloseStack.length === 0) {
        document.body.style.overflow = prevOverflow;
      }
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 t-modal-backdrop animate-fade-in overscroll-contain"
      onClick={() => onCloseRef.current()}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        ref={panelRef}
        className="optical-glass prismatic-rim t-modal-panel w-full max-w-[520px] rounded-t-[28px] sm:rounded-[28px] max-h-[90vh] flex flex-col overflow-hidden animate-slide-up overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
