import { useMemo } from 'react';

import { BarChart3, Bell, Mail, Shield } from 'lucide-react';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import { Button, EmptyState, SearchInputField } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useDebounceSearch } from '@/hooks/utils';
import { canAdminPerform } from '@/lib/domain/auth';

import { SettingsFeatureCard } from './components';

type SettingFeatureItem = {
  id: string;
  category: 'Communications & Messaging' | 'Access & Security' | 'System Configuration';
  title: string;
  description: string;
  to: string;
  icon: typeof Bell;
  tag?: string;
  tagVariant?: 'default' | 'secondary' | 'accent' | 'outline';
  actionLabel?: string;
  requiredPermission?: 'canManageAdminRoles' | 'canWriteAdminData';
};

const SETTINGS_FEATURES: SettingFeatureItem[] = [
  {
    id: 'broadcast-notifications',
    category: 'Communications & Messaging',
    title: 'Broadcast Notifications',
    description:
      'Compose and dispatch web push broadcasts and in-app announcements to all users, specific role cohorts, or individual accounts.',
    to: ROUTE_PATHS.adminNotifications,
    icon: Bell,
    tag: 'Push & In-App',
    actionLabel: 'Compose Broadcast',
    requiredPermission: 'canWriteAdminData',
  },
  {
    id: 'broadcast-dashboard',
    category: 'Communications & Messaging',
    title: 'Broadcast Dashboard',
    description: 'Review push notification subscriptions and read rates for broadcast campaigns.',
    to: ROUTE_PATHS.adminNotificationsDashboard,
    icon: BarChart3,
    tag: 'Broadcast Analytics',
    actionLabel: 'View Dashboard',
    requiredPermission: 'canWriteAdminData',
  },
  {
    id: 'email-templates',
    category: 'Communications & Messaging',
    title: 'Email Templates',
    description:
      'Manage system event slug mappings to Resend email templates and configure required dynamic payload variables.',
    to: ROUTE_PATHS.adminSettingsEmailTemplates,
    icon: Mail,
    tag: 'Resend Integration',
    actionLabel: 'Manage Templates',
    requiredPermission: 'canWriteAdminData',
  },
  {
    id: 'user-roles',
    category: 'Access & Security',
    title: 'User Roles & Permissions',
    description:
      'Assign, modify, and revoke administrative access (super_admin, admin, slod, imt, kiosk) for authenticated users.',
    to: ROUTE_PATHS.adminUserRoles,
    icon: Shield,
    tag: 'Super Admin',
    tagVariant: 'secondary',
    actionLabel: 'Configure Roles',
    requiredPermission: 'canManageAdminRoles',
  },
];

export function AdminSettingsPage() {
  const isSettingsSearchEnabled = false;
  const { data: authState } = useAdminAuthQuery();
  const { searchTerm, setSearchTerm, normalizedSearchTerm, clearSearch } = useDebounceSearch();

  const availableFeatures = useMemo(() => {
    return SETTINGS_FEATURES.filter((feature) => {
      if (!feature.requiredPermission) return true;
      return canAdminPerform(authState?.adminRole, feature.requiredPermission);
    });
  }, [authState?.adminRole]);

  const filteredFeatures = useMemo(() => {
    if (!normalizedSearchTerm) return availableFeatures;
    return availableFeatures.filter((feature) => {
      const matchTitle = feature.title.toLowerCase().includes(normalizedSearchTerm);
      const matchDesc = feature.description.toLowerCase().includes(normalizedSearchTerm);
      const matchCategory = feature.category.toLowerCase().includes(normalizedSearchTerm);
      const matchTag = feature.tag?.toLowerCase().includes(normalizedSearchTerm);
      return matchTitle || matchDesc || matchCategory || matchTag;
    });
  }, [availableFeatures, normalizedSearchTerm]);

  // Group by category
  const categories = useMemo(() => {
    const map = new Map<string, SettingFeatureItem[]>();
    for (const feature of filteredFeatures) {
      const list = map.get(feature.category) ?? [];
      list.push(feature);
      map.set(feature.category, list);
    }
    return Array.from(map.entries());
  }, [filteredFeatures]);

  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="Settings & Launchpad"
        description="Centralized configuration hub for system preferences, integrations, and administration tools."
        breadcrumbs={[{ label: 'Settings' }]}
      />

      <AdminBaseNavigation />

      {isSettingsSearchEnabled && (
        <AdminPageShell.Filters>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <SearchInputField
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onClear={clearSearch}
              placeholder="Search configuration tools and features..."
            />
            <Button
              type="button"
              variant="primaryOutline"
              onClick={clearSearch}
              disabled={normalizedSearchTerm.length === 0}
            >
              Clear
            </Button>
          </div>
        </AdminPageShell.Filters>
      )}

      <AdminPageShell.Content>
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-6 py-12">
            <EmptyState
              icon={<Bell className="h-8 w-8 text-muted" />}
              title="No matching features found"
              description={`No settings or features match "${searchTerm}". Try searching for another keyword.`}
              action={
                isSettingsSearchEnabled && (
                  <Button variant="primaryOutline" onClick={clearSearch}>
                    Clear Search
                  </Button>
                )
              }
            />
          </div>
        ) : (
          categories.map(([categoryName, items]) => (
            <div key={categoryName} className="space-y-4">
              <div>
                <h2 className="font-heading text-lg font-bold tracking-tight text-text">
                  {categoryName}
                </h2>
                <p className="text-xs text-muted">
                  Configure options and tools related to {categoryName.toLowerCase()}.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SettingsFeatureCard
                      key={item.id}
                      to={item.to}
                      title={item.title}
                      description={item.description}
                      icon={<Icon className="h-6 w-6" />}
                      tag={item.tag}
                      tagVariant={item.tagVariant}
                      actionLabel={item.actionLabel}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
