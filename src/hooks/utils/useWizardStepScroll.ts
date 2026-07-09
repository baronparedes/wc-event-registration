import { useEffect } from 'react';

/**
 * Auto-scroll to the active wizard step, respecting user's motion preferences.
 * Scrolls the targeted step ref into view when activeStep changes.
 *
 * @param activeStep Current wizard step (1-based index)
 * @param stepRefs Array of refs for each step container, in order (step 1, step 2, step 3, etc.)
 */
export function useWizardStepScroll(
  activeStep: number,
  stepRefs: (
    | React.RefObject<HTMLDivElement>
    | React.RefObject<HTMLDivElement | null>
    | null
    | undefined
  )[],
) {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

    const targetRef = stepRefs[activeStep - 1];
    if (targetRef?.current) {
      targetRef.current.scrollIntoView({ behavior, block: 'start' });
    }
  }, [activeStep, stepRefs]);
}
