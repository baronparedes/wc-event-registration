import type { ReactNode } from 'react';

import { CheckCircle2, Clock, FileText, RefreshCw, Trash2, XCircle } from 'lucide-react';

import { UI_MESSAGES } from '@/config/constants';

import { Badge, type BadgeVariant } from './Badge';

export type LifecycleStatus = 'draft' | 'published' | 'archived';
export type RegistrationStatus = 'submitted' | 'updated' | 'cancelled' | string;

interface StatusConfig {
  label: string;
  variant: BadgeVariant;
  icon?: ReactNode;
}

const lifecycleStatusConfig: Record<LifecycleStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    variant: 'outline',
    icon: <FileText className="h-3 w-3" />,
  },
  published: {
    label: 'Published',
    variant: 'default',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  archived: {
    label: 'Archived',
    variant: 'destructive',
    icon: <Trash2 className="h-3 w-3" />,
  },
};

const registrationStatusConfig: Record<string, StatusConfig> = {
  submitted: {
    label: UI_MESSAGES.registrationStatus.submitted,
    variant: 'default',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  updated: {
    label: UI_MESSAGES.registrationStatus.updated,
    variant: 'primaryOutline',
    icon: <RefreshCw className="h-3 w-3" />,
  },
  cancelled: {
    label: UI_MESSAGES.registrationStatus.cancelled,
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3" />,
  },
};

/**
 * Standardized status badge for entity lifecycles (Event, Form, etc.).
 */
export function LifecycleStatusBadge({
  status,
  className,
}: {
  status: LifecycleStatus | string;
  className?: string;
}) {
  const config = lifecycleStatusConfig[status as LifecycleStatus] ?? lifecycleStatusConfig.draft;

  return (
    <Badge variant={config.variant} icon={config.icon} className={className}>
      {config.label}
    </Badge>
  );
}

/**
 * Standardized status badge for registrations (Member Registrations, Public Registrations).
 */
export function RegistrationStatusBadge({
  status,
  className,
}: {
  status: RegistrationStatus;
  className?: string;
}) {
  const normalizedStatus = status.toLowerCase();
  const config = registrationStatusConfig[normalizedStatus] ?? {
    label: status,
    variant: 'outline' as BadgeVariant,
    icon: <Clock className="h-3 w-3" />,
  };

  return (
    <Badge variant={config.variant} icon={config.icon} className={className}>
      {config.label}
    </Badge>
  );
}

/**
 * Standardized status badge for member active state.
 */
export function MemberStatusBadge({
  isActive,
  className,
}: {
  isActive: boolean;
  className?: string;
}) {
  return (
    <Badge variant={isActive ? 'default' : 'destructive'} className={className}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
}
