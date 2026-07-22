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
};

/**
 * Computes whether a dropdown should open upward based on available viewport space.
 */
export function useDropdownPlacement({
  isOpen,
  optionCount,
  includesPlaceholder,
}: UseDropdownPlacementOptions): UseDropdownPlacementResult {
  const [opensUpward, setOpensUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const computeOpenDirection = useCallback((): boolean => {
    const triggerElement = containerRef.current?.querySelector('button');
    if (!triggerElement) return false;

    const triggerRect = triggerElement.getBoundingClientRect();
    const estimatedOptionRows = Math.min(optionCount + (includesPlaceholder ? 1 : 0), 6);
    const estimatedMenuHeight = estimatedOptionRows * 40 + 12;
    const minimumSpaceThreshold = 160;
    const availableSpaceBelow = window.innerHeight - triggerRect.bottom;
    const availableSpaceAbove = triggerRect.top;

    return (
      availableSpaceBelow < Math.max(minimumSpaceThreshold, estimatedMenuHeight / 2) &&
      availableSpaceAbove > availableSpaceBelow
    );
  }, [includesPlaceholder, optionCount]);

  const prepareOpenDirection = useCallback(() => {
    setOpensUpward(computeOpenDirection());
  }, [computeOpenDirection]);

  useEffect(() => {
    if (!isOpen) return;

    function updateDirection() {
      setOpensUpward(computeOpenDirection());
    }

    updateDirection();
    window.addEventListener('resize', updateDirection);
    window.addEventListener('scroll', updateDirection, true);

    return () => {
      window.removeEventListener('resize', updateDirection);
      window.removeEventListener('scroll', updateDirection, true);
    };
  }, [computeOpenDirection, isOpen]);

  return { containerRef, opensUpward, prepareOpenDirection };
}
