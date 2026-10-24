import { useCallback, useEffect, useRef, useState } from 'react';

type UseDropdownPlacementOptions = {
  isOpen: boolean;
  optionCount: number;
  includesPlaceholder: boolean;
};

type UseDropdownPlacementResult = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  opensUpward: boolean;
  prepareOpenDirection: () => void;
  maxMenuHeight?: number;
};

/**
 * Computes whether a dropdown should open upward based on available viewport and scroll container space.
 */
export function useDropdownPlacement({
  isOpen,
  optionCount,
  includesPlaceholder,
}: UseDropdownPlacementOptions): UseDropdownPlacementResult {
  const [opensUpward, setOpensUpward] = useState(false);
  const [maxMenuHeight, setMaxMenuHeight] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculatePlacement = useCallback((): {
    shouldOpenUpward: boolean;
    computedMaxHeight: number;
  } => {
    const triggerElement =
      containerRef.current?.querySelector('button, input') ?? containerRef.current;
    if (!triggerElement) {
      return { shouldOpenUpward: false, computedMaxHeight: 240 };
    }

    const triggerRect = triggerElement.getBoundingClientRect();
    const estimatedOptionRows = Math.min(optionCount + (includesPlaceholder ? 1 : 0), 6);
    const estimatedMenuHeight = Math.max(estimatedOptionRows * 40 + 16, 220);
    let availableSpaceBelow = window.innerHeight - triggerRect.bottom;
    let availableSpaceAbove = triggerRect.top;

    let parent = triggerElement.parentElement;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY || style.overflow;
      if (
        (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'hidden') &&
        (parent.clientHeight > 0 || parent.getBoundingClientRect().height > 0)
      ) {
        const parentRect = parent.getBoundingClientRect();
        availableSpaceBelow = Math.min(availableSpaceBelow, parentRect.bottom - triggerRect.bottom);
        availableSpaceAbove = Math.min(availableSpaceAbove, triggerRect.top - parentRect.top);
      }
      parent = parent.parentElement;
    }

    availableSpaceBelow = Math.max(0, availableSpaceBelow);
    availableSpaceAbove = Math.max(0, availableSpaceAbove);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const shouldOpenUpward = isMobile
      ? availableSpaceAbove > availableSpaceBelow || availableSpaceBelow < estimatedMenuHeight
      : availableSpaceBelow < estimatedMenuHeight && availableSpaceAbove > availableSpaceBelow;

    const targetSpace = shouldOpenUpward ? availableSpaceAbove : availableSpaceBelow;
    const computedMaxHeight = Math.min(240, Math.max(140, Math.floor(targetSpace - 8)));

    return { shouldOpenUpward, computedMaxHeight };
  }, [includesPlaceholder, optionCount]);

  const prepareOpenDirection = useCallback(() => {
    const { shouldOpenUpward, computedMaxHeight } = calculatePlacement();
    setOpensUpward(shouldOpenUpward);
    setMaxMenuHeight(computedMaxHeight);
  }, [calculatePlacement]);

  useEffect(() => {
    if (!isOpen) return;

    function updatePlacement() {
      const { shouldOpenUpward, computedMaxHeight } = calculatePlacement();
      setOpensUpward(shouldOpenUpward);
      setMaxMenuHeight(computedMaxHeight);
    }

    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);

    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [calculatePlacement, isOpen]);

  return { containerRef, opensUpward, prepareOpenDirection, maxMenuHeight };
}
