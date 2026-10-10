import { useEffect, useState } from 'react';

import { Check, ChevronDown, Users, X } from 'lucide-react';

import { Badge } from '@/components/ui';
import { useDropdownPlacement } from '@/hooks/utils';

import {
  ALL_BROADCAST_ROLES,
  BROADCAST_ROLE_CATEGORIES,
  getBroadcastRoleLabel,
} from '../constants';

export interface BroadcastRoleMultiSelectProps {
  id?: string;
  selectedRoles: string[];
  onChange: (roles: string[]) => void;
  error?: string;
}

export function BroadcastRoleMultiSelect({
  id = 'targetRoles',
  selectedRoles = [],
  onChange,
  error,
}: BroadcastRoleMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { containerRef, opensUpward, prepareOpenDirection } = useDropdownPlacement({
    isOpen,
    optionCount: ALL_BROADCAST_ROLES.length + 3,
    includesPlaceholder: true,
  });

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, isOpen]);

  const handleToggleRole = (value: string) => {
    if (selectedRoles.includes(value)) {
      onChange(selectedRoles.filter((r) => r !== value));
    } else {
      onChange([...selectedRoles, value]);
    }
  };

  const handleSelectAll = () => {
    onChange(ALL_BROADCAST_ROLES.map((r) => r.value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const summaryText =
    selectedRoles.length === 0
      ? 'Select target roles...'
      : selectedRoles.length === 1
        ? getBroadcastRoleLabel(selectedRoles[0])
        : `${selectedRoles.length} roles selected`;

  return (
    <div className="space-y-2" ref={containerRef}>
      <label htmlFor={id} className="block text-sm font-medium text-text">
        Target Roles <span className="text-red-500">*</span>
      </label>

      <div className="relative">
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label="Target roles selection trigger"
          onClick={() => {
            if (!isOpen) {
              prepareOpenDirection();
            }
            setIsOpen((prev) => !prev);
          }}
          className={`flex w-full items-center justify-between rounded-md border bg-background px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            error ? 'border-red-500' : 'border-border focus:border-primary'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Users className="h-4 w-4 text-muted shrink-0" />
            <span className={selectedRoles.length === 0 ? 'text-muted' : 'text-text font-medium'}>
              {summaryText}
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted shrink-0 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div
            role="listbox"
            aria-label="Target roles selection"
            className={`absolute left-0 right-0 z-30 max-h-72 overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-lg divide-y divide-border/20 ${
              opensUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            }`}
          >
            {/* Quick Actions Header */}
            <div className="flex items-center justify-between px-2 pb-2 text-xs">
              <span className="text-muted font-medium">Select multiple roles</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-primary hover:underline font-medium cursor-pointer"
                >
                  Select all
                </button>
                <span className="text-border">•</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-muted hover:text-text cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Role Categories List */}
            <div className="pt-2 space-y-3">
              {BROADCAST_ROLE_CATEGORIES.map((category) => (
                <div key={category.title} className="space-y-1">
                  <p className="px-2 text-[11px] font-semibold text-muted uppercase tracking-wider">
                    {category.title}
                  </p>
                  <div className="space-y-0.5">
                    {category.items.map((item) => {
                      const isChecked = selectedRoles.includes(item.value);
                      return (
                        <label
                          key={item.value}
                          className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-background text-text'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleRole(item.value)}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                            />
                            <span>{item.label}</span>
                          </div>
                          {isChecked && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Role Badges / Pills */}
      {selectedRoles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedRoles.map((role) => (
            <Badge
              key={role}
              variant="primaryOutline"
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1"
            >
              <span>{getBroadcastRoleLabel(role)}</span>
              <button
                type="button"
                aria-label={`Remove role ${getBroadcastRoleLabel(role)}`}
                onClick={() => handleToggleRole(role)}
                className="hover:text-red-500 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
