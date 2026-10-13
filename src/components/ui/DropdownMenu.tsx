import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import { Link } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

type DropdownMenuProps = {
  trigger: ReactNode;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  menuClassName?: string;
  usePortal?: boolean;
};

export function DropdownMenu({
  trigger,
  children,
  open,
  onOpenChange,
  className,
  menuClassName,
  usePortal = false,
}: DropdownMenuProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    right: number;
    maxHeight?: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open || !usePortal) return;

    function updateCoords() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      // If space below is less than ~280px and more space above, open upwards
      const placeAbove = spaceBelow < 280 && rect.top > spaceBelow;

      if (placeAbove) {
        setCoords({
          bottom: viewportHeight - rect.top + 4,
          right: Math.max(8, window.innerWidth - rect.right),
          maxHeight: Math.max(120, rect.top - 12),
        });
      } else {
        setCoords({
          top: rect.bottom + 4,
          right: Math.max(8, window.innerWidth - rect.right),
          maxHeight: Math.max(120, spaceBelow - 12),
        });
      }
    }

    updateCoords();

    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);

    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [open, usePortal]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        onOpenChange(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onOpenChange]);

  const menuElement = open && (
    <div
      ref={menuRef}
      style={
        usePortal
          ? {
              position: 'fixed',
              top: coords?.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords?.bottom !== undefined ? `${coords.bottom}px` : undefined,
              right: coords ? `${coords.right}px` : undefined,
              maxHeight: coords?.maxHeight !== undefined ? `${coords.maxHeight}px` : undefined,
              visibility: coords ? 'visible' : 'hidden',
            }
          : undefined
      }
      className={twMerge(
        usePortal
          ? 'z-50 min-w-48 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-md border border-border bg-surface shadow-lg'
          : 'absolute right-0 top-full z-40 mt-1 min-w-48 rounded-md border border-border bg-surface shadow-lg',
        menuClassName,
      )}
    >
      {children}
    </div>
  );

  return (
    <div ref={triggerRef} className={twMerge('relative', className)}>
      {trigger}
      {open && (usePortal ? createPortal(menuElement, document.body) : menuElement)}
    </div>
  );
}

type DropdownMenuItemProps = {
  to?: string;
  children: ReactNode;
  onClick?: () => void;
};

export function DropdownMenuItem({ to, children, onClick }: DropdownMenuItemProps) {
  if (!to) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left px-4 py-2.5 text-sm text-text transition hover:bg-background/50"
      >
        {children}
      </button>
    );
  }

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
