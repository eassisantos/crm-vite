import { RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface UseModalAccessibilityOptions {
  onClose?: () => void;
  initialFocusRef?: RefObject<HTMLElement> | null;
}

export function useModalAccessibility(
  isOpen: boolean,
  containerRef: RefObject<HTMLElement>,
  { onClose, initialFocusRef }: UseModalAccessibilityOptions = {}
) {
  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    const previouslyFocusedElement = document.activeElement as HTMLElement | null;

    const resolveFocusable = () => {
      const allFocusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(element => !element.hasAttribute('aria-hidden'));
      return allFocusable;
    };

    const focusTarget = initialFocusRef?.current ?? resolveFocusable()[0] ?? container;
    focusTarget?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = resolveFocusable();

      if (focusableElements.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (activeElement === firstElement || activeElement === container) {
          event.preventDefault();
          lastElement.focus({ preventScroll: true });
        }
        return;
      }

      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus({ preventScroll: true });
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElement?.focus({ preventScroll: true });
    };
  }, [isOpen, containerRef, onClose, initialFocusRef]);
}
