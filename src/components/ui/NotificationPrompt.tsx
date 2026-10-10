import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  createContext,
  useContext,
} from 'react';

import { AlertCircle, AlertTriangle, Bell, CheckCircle2, Info, Loader2, X } from 'lucide-react';

export type NotificationPromptVariant =
  | 'primary'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'loading';
export type NotificationPromptPosition = 'fixed' | 'static' | 'relative';

type NotificationPromptContextValue = {
  onDismiss?: () => void;
  variant?: NotificationPromptVariant;
};

const NotificationPromptContext = createContext<NotificationPromptContextValue | null>(null);

function useNotificationPromptContext() {
  return useContext(NotificationPromptContext);
}

export type NotificationPromptProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  onDismiss?: () => void;
  ariaLabel?: string;
  className?: string;
  containerClassName?: string;
  position?: NotificationPromptPosition;
  variant?: NotificationPromptVariant;
  duration?: number;
  showProgressBar?: boolean;
};

const VARIANT_CONTAINER_BORDER: Record<NotificationPromptVariant, string> = {
  primary: 'border-border/80',
  success: 'border-emerald-500/30',
  error: 'border-rose-500/30',
  warning: 'border-amber-500/30',
  info: 'border-sky-500/30',
  loading: 'border-border/80',
};

const VARIANT_PROGRESS_CLASSES: Record<NotificationPromptVariant, string> = {
  primary: 'bg-primary',
  success: 'bg-emerald-500',
  error: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
  loading: 'bg-primary',
};

export function NotificationPrompt({
  children,
  onDismiss,
  ariaLabel = 'Notification prompt',
  className = '',
  containerClassName = '',
  position = 'fixed',
  variant = 'primary',
  duration,
  showProgressBar = false,
  ...props
}: NotificationPromptProps) {
  const positionClass =
    position === 'fixed'
      ? 'fixed bottom-4 left-4 right-4 z-30 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md animate-fadeIn select-none'
      : position === 'relative'
        ? 'relative w-full max-w-md select-none'
        : 'w-full select-none';

  const defaultCardClass =
    'relative flex flex-col gap-3 rounded-2xl border bg-surface p-4 shadow-xl select-none overflow-hidden';
  const borderClass = VARIANT_CONTAINER_BORDER[variant] || 'border-border/80';

  const hasProgressBar =
    showProgressBar &&
    typeof duration === 'number' &&
    duration > 0 &&
    Number.isFinite(duration) &&
    variant !== 'loading';

  return (
    <NotificationPromptContext.Provider value={{ onDismiss, variant }}>
      <aside
        role="region"
        aria-label={ariaLabel}
        className={`${positionClass} ${className}`.trim()}
        {...props}
      >
        <div className={`${defaultCardClass} ${borderClass} ${containerClassName}`.trim()}>
          {children}
          {hasProgressBar && (
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 w-full overflow-hidden bg-black/5 dark:bg-white/5"
              aria-hidden="true"
              data-testid="toast-progress-bar"
            >
              <div
                className={`h-full w-full animate-toast-progress ${VARIANT_PROGRESS_CLASSES[variant] || 'bg-primary'}`}
                style={{ '--toast-duration': `${duration}ms` } as CSSProperties}
                data-testid="toast-progress-bar-fill"
              />
            </div>
          )}
        </div>
      </aside>
    </NotificationPromptContext.Provider>
  );
}

const VARIANT_ICON_CLASSES: Record<NotificationPromptVariant, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  error: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  loading: 'bg-primary/10 text-primary',
};

const DEFAULT_VARIANT_ICONS: Record<NotificationPromptVariant, ReactNode> = {
  primary: <Bell className="h-5 w-5" />,
  success: <CheckCircle2 className="h-5 w-5" />,
  error: <AlertCircle className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
  loading: <Loader2 className="h-5 w-5 animate-spin" />,
};

export type NotificationPromptHeaderProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
};

export function NotificationPromptHeader({
  children,
  className = '',
  ...props
}: NotificationPromptHeaderProps) {
  return (
    <div className={`flex items-start gap-3 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export type NotificationPromptIconProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  variant?: NotificationPromptVariant;
  className?: string;
};

export function NotificationPromptIcon({
  children,
  variant,
  className = '',
  ...props
}: NotificationPromptIconProps) {
  const context = useNotificationPromptContext();
  const activeVariant = variant || context?.variant || 'primary';
  const variantClass = VARIANT_ICON_CLASSES[activeVariant] || VARIANT_ICON_CLASSES.primary;
  const content = children ?? DEFAULT_VARIANT_ICONS[activeVariant];

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${variantClass} ${className}`.trim()}
      {...props}
    >
      {content}
    </div>
  );
}

export type NotificationPromptContentProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
};

export function NotificationPromptContent({
  children,
  className = '',
  ...props
}: NotificationPromptContentProps) {
  return (
    <div
      className={`min-w-0 flex-1 pr-6 flex flex-col justify-center min-h-10 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export type NotificationPromptTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  children: ReactNode;
  as?: 'h2' | 'h3' | 'h4' | 'div';
  className?: string;
};

export function NotificationPromptTitle({
  children,
  as: Component = 'h3',
  className = '',
  ...props
}: NotificationPromptTitleProps) {
  return (
    <Component className={`text-sm font-semibold text-text ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

export type NotificationPromptDescriptionProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
  className?: string;
};

export function NotificationPromptDescription({
  children,
  className = '',
  ...props
}: NotificationPromptDescriptionProps) {
  return (
    <p className={`mt-0.5 text-xs leading-relaxed text-muted ${className}`.trim()} {...props}>
      {children}
    </p>
  );
}

export type NotificationPromptDismissButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ariaLabel?: string;
  className?: string;
};

export function NotificationPromptDismissButton({
  onClick,
  ariaLabel = 'Dismiss notification prompt',
  className = '',
  ...props
}: NotificationPromptDismissButtonProps) {
  const context = useNotificationPromptContext();
  const handleClick = onClick || context?.onDismiss;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={handleClick}
      className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-primary/10 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`.trim()}
      {...props}
    >
      <X className="h-4 w-4" />
    </button>
  );
}

export type NotificationPromptActionsProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
};

export function NotificationPromptActions({
  children,
  className = '',
  ...props
}: NotificationPromptActionsProps) {
  return (
    <div
      className={`flex items-center justify-end gap-2 border-t border-border/40 pt-2 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

NotificationPrompt.Header = NotificationPromptHeader;
NotificationPrompt.Icon = NotificationPromptIcon;
NotificationPrompt.Content = NotificationPromptContent;
NotificationPrompt.Title = NotificationPromptTitle;
NotificationPrompt.Description = NotificationPromptDescription;
NotificationPrompt.DismissButton = NotificationPromptDismissButton;
NotificationPrompt.Actions = NotificationPromptActions;
