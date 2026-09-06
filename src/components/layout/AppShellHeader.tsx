import type { ReactNode } from 'react';

import { ChevronDown, Menu } from 'lucide-react';

import brandLogo from '@/assets/wc-hub-brand-white.png';

import { Button } from '../ui';

type AppShellHeaderProps = {
  isMinimizedShell: boolean;
  userBadge: ReactNode;
  onOpenDrawer: () => void;
};

export function AppShellHeader({ isMinimizedShell, userBadge, onOpenDrawer }: AppShellHeaderProps) {
  if (isMinimizedShell) {
    return (
      <div className="sticky top-0 z-30 px-3 pt-1.5 print:hidden">
        <div className="mx-auto flex w-fit justify-center">
          <button
            type="button"
            aria-label="Open app navigation drawer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/95 px-2 py-1.5 text-[11px] font-semibold text-text shadow-xs backdrop-blur transition hover:bg-primary/10"
            onClick={onOpenDrawer}
          >
            {userBadge && <span className="flex items-center justify-center">{userBadge}</span>}
            <span className="inline-flex items-center gap-1.5 border-l border-border pl-2">
              <ChevronDown className="h-4 w-4" />
              <span>Menu</span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface print:hidden">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-1">
        <div className="flex items-center gap-3">
          <img src={brandLogo} alt="Welcome Hub" className="h-20 object-cover object-center" />
        </div>

        <div className="flex items-center gap-3">
          {userBadge}
          <Button
            type="button"
            aria-label="Open app navigation drawer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-text shadow-xs transition hover:bg-primary/10"
            onClick={onOpenDrawer}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  );
}
