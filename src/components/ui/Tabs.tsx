import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(componentName: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`<${componentName} /> must be used within a <Tabs /> provider.`);
  }
  return context;
}

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  children,
  className = '',
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const baseId = useId();

  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = useCallback(
    (nextValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [isControlled, onValueChange],
  );

  const contextValue = useMemo<TabsContextValue>(
    () => ({
      value: activeValue,
      onValueChange: handleValueChange,
      baseId,
    }),
    [activeValue, handleValueChange, baseId],
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={`w-full ${className}`.trim()}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

export function TabsList({
  children,
  className = '',
  containerClassName = '',
  ...props
}: TabsListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 2;
    setHasOverflow(overflow);
    setCanScrollLeft(overflow && el.scrollLeft > 4);
    setCanScrollRight(overflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);

    const el = scrollContainerRef.current;
    let observer: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => checkScroll());
      observer.observe(el);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [checkScroll, children]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = Math.max(140, el.clientWidth * 0.6);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.getAttribute('role') !== 'tab') {
      return;
    }

    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'),
    );
    const currentIndex = tabs.indexOf(target as HTMLButtonElement);
    if (currentIndex === -1) {
      return;
    }

    let nextIndex: number;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    if (nextTab) {
      nextTab.focus();
      nextTab.click();
    }
  };

  return (
    <div className={`flex w-full justify-center ${containerClassName}`.trim()}>
      <div
        className={`relative inline-flex max-w-full items-center overflow-hidden rounded-full border border-border bg-surface p-1 shadow-xs isolate ${className}`.trim()}
      >
        {/* Floating Left Scroll Button */}
        {hasOverflow && (
          <button
            type="button"
            aria-label="Scroll tabs left"
            disabled={!canScrollLeft}
            onClick={() => handleScroll('left')}
            className={`absolute left-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-transparent text-muted transition-all hover:text-text focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-hidden ${
              canScrollLeft ? 'cursor-pointer opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Scrollable Tabs Track */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          role="tablist"
          onKeyDown={handleKeyDown}
          className="flex min-w-0 items-center gap-1 overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0"
          {...props}
        >
          {children}
        </div>

        {/* Floating Right Scroll Button */}
        {hasOverflow && (
          <button
            type="button"
            aria-label="Scroll tabs right"
            disabled={!canScrollRight}
            onClick={() => handleScroll('right')}
            className={`absolute right-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-transparent text-muted transition-all hover:text-text focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-hidden ${
              canScrollRight ? 'cursor-pointer opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export interface TabsTriggerProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'value'
> {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsTrigger({
  value,
  children,
  className = '',
  disabled = false,
  onClick,
  ...props
}: TabsTriggerProps) {
  const { value: activeValue, onValueChange, baseId } = useTabsContext('TabsTrigger');
  const isSelected = activeValue === value;
  const triggerId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (
      isSelected &&
      triggerRef.current &&
      typeof triggerRef.current.scrollIntoView === 'function'
    ) {
      triggerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [isSelected]);

  return (
    <button
      ref={triggerRef}
      type="button"
      role="tab"
      id={triggerId}
      aria-selected={isSelected}
      aria-controls={panelId}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented && !disabled) {
          onValueChange(value);
        }
      }}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 ${
        isSelected
          ? 'bg-primary font-semibold text-white shadow-xs'
          : 'text-muted hover:bg-background/50 hover:text-text'
      } ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className = '', ...props }: TabsContentProps) {
  const { value: activeValue, baseId } = useTabsContext('TabsContent');
  const isSelected = activeValue === value;
  const triggerId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  if (!isSelected) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={triggerId}
      tabIndex={0}
      className={`mt-4 focus-visible:outline-hidden ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
