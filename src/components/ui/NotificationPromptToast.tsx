import type { ReactElement, ReactNode } from 'react';

import { type ExternalToast, toast } from 'sonner';

import { Button } from './Button';
import {
  NotificationPrompt,
  NotificationPromptActions,
  NotificationPromptContent,
  NotificationPromptDescription,
  NotificationPromptDismissButton,
  NotificationPromptHeader,
  NotificationPromptIcon,
  NotificationPromptTitle,
  type NotificationPromptVariant,
} from './NotificationPrompt';

export interface PromptToastAction {
  label: ReactNode;
  onClick: () => void | Promise<void>;
}

export interface PromptToastCancel {
  label?: ReactNode;
  onClick?: () => void;
}

export interface PromptToastOptions extends Omit<ExternalToast, 'action' | 'cancel'> {
  title?: ReactNode;
  description?: ReactNode;
  variant?: NotificationPromptVariant;
  icon?: ReactNode;
  duration?: number;
  action?: PromptToastAction;
  cancel?: PromptToastCancel;
  onDismiss?: () => void;
  className?: string;
  ariaLabel?: string;
}

// Preserve pristine native Sonner emitters even across HMR re-evaluations
const toastWithInternals = toast as unknown as {
  __nativeCustom?: typeof toast.custom;
  __nativeDismiss?: typeof toast.dismiss;
};

const nativeToastCustom: typeof toast.custom =
  toastWithInternals.__nativeCustom ||
  (typeof toast?.custom === 'function' ? toast.custom.bind(toast) : toast?.custom);

const nativeToastDismiss: typeof toast.dismiss =
  toastWithInternals.__nativeDismiss ||
  (typeof toast?.dismiss === 'function' ? toast.dismiss.bind(toast) : toast?.dismiss);

if (typeof toast !== 'undefined') {
  toastWithInternals.__nativeCustom = nativeToastCustom;
  toastWithInternals.__nativeDismiss = nativeToastDismiss;
}

function formatTitle(title: unknown): ReactNode {
  if (title === null || title === undefined) return '';
  if (title instanceof Error) return title.message;
  if (typeof title === 'string' || typeof title === 'number' || typeof title === 'boolean') {
    return String(title);
  }
  if (
    typeof title === 'object' &&
    'message' in title &&
    typeof (title as { message: unknown }).message === 'string'
  ) {
    return (title as { message: string }).message;
  }
  return title as ReactNode;
}

function normalizeOptions(data?: ExternalToast | PromptToastOptions): PromptToastOptions {
  if (!data) return {};
  if (typeof data === 'object') {
    const { action, cancel, ...rest } = data as PromptToastOptions & {
      action?: unknown;
      cancel?: unknown;
    };

    let normalizedAction: PromptToastAction | undefined;
    if (action && typeof action === 'object') {
      const act = action as { label?: ReactNode; onClick?: (e?: unknown) => void | Promise<void> };
      if (act.label && act.onClick) {
        normalizedAction = {
          label: act.label,
          onClick: () => act.onClick?.(),
        };
      }
    }

    let normalizedCancel: PromptToastCancel | undefined;
    if (cancel && typeof cancel === 'object') {
      const can = cancel as { label?: ReactNode; onClick?: (e?: unknown) => void };
      normalizedCancel = {
        label: can.label,
        onClick: can.onClick ? () => can.onClick?.() : undefined,
      };
    }

    return {
      ...rest,
      action: normalizedAction,
      cancel: normalizedCancel,
    };
  }
  return {};
}

export function showPromptToast(
  titleOrOptions: ReactNode | PromptToastOptions,
  maybeOptions?: ExternalToast | PromptToastOptions,
): string | number {
  let resolvedOptions: PromptToastOptions;

  if (
    typeof titleOrOptions === 'object' &&
    titleOrOptions !== null &&
    !('$$typeof' in titleOrOptions) &&
    !('props' in titleOrOptions) &&
    !Array.isArray(titleOrOptions)
  ) {
    resolvedOptions = titleOrOptions as PromptToastOptions;
  } else {
    resolvedOptions = {
      ...normalizeOptions(maybeOptions),
      title: formatTitle(titleOrOptions),
    };
  }

  const {
    title,
    description,
    variant = 'primary',
    icon,
    duration = variant === 'loading' ? Infinity : 5000,
    action,
    cancel,
    onDismiss,
    className = '',
    ariaLabel = 'Toast notification',
    ...restOptions
  } = resolvedOptions;

  const customEmitter = nativeToastCustom || toast.custom;

  return customEmitter(
    (toastId) => {
      const handleDismiss = () => {
        onDismiss?.();
        if (nativeToastDismiss) {
          nativeToastDismiss(toastId);
        } else {
          toast.dismiss(toastId);
        }
      };

      const handleCancel = () => {
        cancel?.onClick?.();
        handleDismiss();
      };

      const handleAction = async () => {
        try {
          if (action?.onClick) {
            await action.onClick();
          }
        } finally {
          handleDismiss();
        }
      };

      const hasActions = Boolean(action || cancel);

      return (
        <NotificationPrompt
          position="static"
          variant={variant}
          ariaLabel={ariaLabel}
          onDismiss={handleDismiss}
          duration={duration}
          showProgressBar={Boolean(
            duration && duration > 0 && Number.isFinite(duration) && variant !== 'loading',
          )}
          className={`w-full max-w-sm sm:max-w-md ${className}`.trim()}
        >
          <NotificationPromptHeader>
            <NotificationPromptIcon variant={variant}>{icon}</NotificationPromptIcon>
            <NotificationPromptContent>
              <NotificationPromptTitle>{title}</NotificationPromptTitle>
              {description && (
                <NotificationPromptDescription>{description}</NotificationPromptDescription>
              )}
            </NotificationPromptContent>
            {variant !== 'loading' && (
              <NotificationPromptDismissButton ariaLabel="Dismiss notification" />
            )}
          </NotificationPromptHeader>

          {hasActions && (
            <NotificationPromptActions>
              {cancel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleCancel}
                  className="text-xs text-muted hover:text-text"
                >
                  {cancel.label ?? 'Cancel'}
                </Button>
              )}
              {action && (
                <Button type="button" size="xs" onClick={handleAction} className="gap-1.5">
                  {action.label}
                </Button>
              )}
            </NotificationPromptActions>
          )}
        </NotificationPrompt>
      );
    },
    { duration, ...restOptions },
  );
}

export const promptToast = Object.assign(showPromptToast, {
  success: (title: unknown, data?: ExternalToast | PromptToastOptions) => {
    const opts = normalizeOptions(data);
    return showPromptToast({ ...opts, title: formatTitle(title), variant: 'success' });
  },
  error: (title: unknown, data?: ExternalToast | PromptToastOptions) => {
    const opts = normalizeOptions(data);
    return showPromptToast({ ...opts, title: formatTitle(title), variant: 'error' });
  },
  warning: (title: unknown, data?: ExternalToast | PromptToastOptions) => {
    const opts = normalizeOptions(data);
    return showPromptToast({ ...opts, title: formatTitle(title), variant: 'warning' });
  },
  info: (title: unknown, data?: ExternalToast | PromptToastOptions) => {
    const opts = normalizeOptions(data);
    return showPromptToast({ ...opts, title: formatTitle(title), variant: 'info' });
  },
  message: (title: unknown, data?: ExternalToast | PromptToastOptions) => {
    const opts = normalizeOptions(data);
    return showPromptToast({ ...opts, title: formatTitle(title), variant: 'primary' });
  },
  loading: (title: unknown, data?: ExternalToast | PromptToastOptions) => {
    const opts = normalizeOptions(data);
    return showPromptToast({
      ...opts,
      title: formatTitle(title ?? 'Loading...'),
      variant: 'loading',
    });
  },
  promise: <ToastData,>(
    promise: Promise<ToastData> | (() => Promise<ToastData>),
    data?: {
      loading?: ReactNode | PromptToastOptions;
      success?: ReactNode | ((data: ToastData) => ReactNode | PromptToastOptions);
      error?: ReactNode | ((err: unknown) => ReactNode | PromptToastOptions);
      finally?: () => void | Promise<void>;
    },
  ) => {
    const loadingOpts =
      typeof data?.loading === 'object' && data.loading !== null && !('$$typeof' in data.loading)
        ? (data.loading as PromptToastOptions)
        : { title: formatTitle(data?.loading ?? 'Loading...') };

    const toastId = showPromptToast({
      ...loadingOpts,
      variant: 'loading',
    });

    const p = typeof promise === 'function' ? promise() : promise;

    p.then((result) => {
      let successOpts: PromptToastOptions;
      if (typeof data?.success === 'function') {
        const res = data.success(result);
        if (typeof res === 'object' && res !== null && !('$$typeof' in res)) {
          successOpts = res as PromptToastOptions;
        } else {
          successOpts = { title: formatTitle(res) };
        }
      } else if (data?.success) {
        if (typeof data.success === 'object' && !('$$typeof' in data.success)) {
          successOpts = data.success as PromptToastOptions;
        } else {
          successOpts = { title: formatTitle(data.success) };
        }
      } else {
        successOpts = { title: 'Success' };
      }

      showPromptToast({
        ...successOpts,
        id: toastId,
        variant: 'success',
      });
      return result;
    })
      .catch((err: unknown) => {
        let errorOpts: PromptToastOptions;
        if (typeof data?.error === 'function') {
          const res = data.error(err);
          if (typeof res === 'object' && res !== null && !('$$typeof' in res)) {
            errorOpts = res as PromptToastOptions;
          } else {
            errorOpts = { title: formatTitle(res) };
          }
        } else if (data?.error) {
          if (typeof data.error === 'object' && !('$$typeof' in data.error)) {
            errorOpts = data.error as PromptToastOptions;
          } else {
            errorOpts = { title: formatTitle(data.error) };
          }
        } else {
          errorOpts = { title: formatTitle(err) || 'An error occurred' };
        }

        showPromptToast({
          ...errorOpts,
          id: toastId,
          variant: 'error',
        });
      })
      .finally(() => {
        data?.finally?.();
      });

    return toastId;
  },
  custom: (
    jsxOrOptions: ReactElement | PromptToastOptions | ((id: string | number) => ReactElement),
    data?: ExternalToast | PromptToastOptions,
  ) => {
    if (
      typeof jsxOrOptions === 'function' ||
      (typeof jsxOrOptions === 'object' &&
        jsxOrOptions !== null &&
        ('$$typeof' in jsxOrOptions || 'props' in jsxOrOptions))
    ) {
      const customEmitter = nativeToastCustom || toast.custom;
      return customEmitter(
        jsxOrOptions as (id: string | number) => ReactElement,
        data as ExternalToast,
      );
    }
    return showPromptToast(jsxOrOptions as PromptToastOptions, data);
  },
  dismiss: (id?: string | number) => {
    if (nativeToastDismiss) {
      return nativeToastDismiss(id);
    }
    return toast.dismiss(id);
  },
});

// Patch Sonner singleton methods to render NotificationPrompt by default at runtime in the browser
if (
  typeof window !== 'undefined' &&
  typeof toast !== 'undefined' &&
  import.meta.env.MODE !== 'test'
) {
  toast.success = promptToast.success as typeof toast.success;
  toast.error = promptToast.error as typeof toast.error;
  toast.warning = promptToast.warning as typeof toast.warning;
  toast.info = promptToast.info as typeof toast.info;
  toast.message = promptToast.message as typeof toast.message;
  toast.loading = promptToast.loading as typeof toast.loading;
  toast.promise = promptToast.promise as typeof toast.promise;
  toast.custom = promptToast.custom as typeof toast.custom;
  toast.dismiss = promptToast.dismiss as typeof toast.dismiss;
}
