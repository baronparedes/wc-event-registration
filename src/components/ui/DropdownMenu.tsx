import { type ReactNode, useEffect, useRef } from 'react';

import { Link } from 'react-router-dom';

type DropdownMenuProps = {
  trigger: ReactNode;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DropdownMenu({ trigger, children, open, onOpenChange }: DropdownMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative">
      {trigger}
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 min-w-48 rounded-md border border-border bg-surface shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

type DropdownMenuItemProps = {
  to: string;
  children: ReactNode;
  onClick?: () => void;
};

export function DropdownMenuItem({ to, children, onClick }: DropdownMenuItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block px-4 py-2.5 text-sm text-text transition hover:bg-background/50"
    >
      {children}
    </Link>
  );
}
