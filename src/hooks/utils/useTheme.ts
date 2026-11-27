import { useContext } from 'react';

import {
  type ResolvedTheme,
  ThemeContext,
  type ThemeContextValue,
  type ThemePreference,
} from '@/app/providers/themeContext';

export type { ResolvedTheme, ThemeContextValue, ThemePreference };

const FALLBACK_THEME_CONTEXT: ThemeContextValue = {
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
};

/**
 * Access the active theme preference (`light` | `dark` | `system`),
 * resolved theme (`light` | `dark`), and setter.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  return context ?? FALLBACK_THEME_CONTEXT;
}
