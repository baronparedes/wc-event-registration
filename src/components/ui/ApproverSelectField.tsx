import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Check, Search, ShieldCheck, X } from 'lucide-react';

import { Avatar, Badge, Spinner } from '@/components/ui';
import { useApproverUsersQuery } from '@/hooks/domain/auth';
import { useDropdownPlacement } from '@/hooks/utils';
import type { ApproverUserItem } from '@/lib/domain/auth';

export interface ApproverSelectFieldProps {
  id?: string;
  value?: string; // approver_email
  onChange: (approver: ApproverUserItem | null) => void;
  disabled?: boolean;
  disabledEmails?: string[];
  error?: string | null;
  label?: string;
  helperText?: string;
  required?: boolean;
}

export function ApproverSelectField({
  id: externalId,
  value,
  onChange,
  disabled = false,
  disabledEmails,
  error,
  label = 'Designated Approver',
  helperText = 'Select an administrator or reviewer who will receive submission alerts and review requests.',
  required = true,
}: ApproverSelectFieldProps) {
  const generatedId = useId();
  const inputId = externalId || generatedId;

  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedApproverCache, setSelectedApproverCache] = useState<ApproverUserItem | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data: approvers = [], isLoading, isError } = useApproverUsersQuery();

  const normalizedDisabledEmails = useMemo(() => {
    return (disabledEmails ?? []).map((e) => e.trim().toLowerCase());
  }, [disabledEmails]);

  const filteredApprovers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return approvers;
    return approvers.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q),
    );
  }, [approvers, searchTerm]);

  const { containerRef, opensUpward, prepareOpenDirection, maxMenuHeight } = useDropdownPlacement({
    isOpen,
    optionCount: filteredApprovers.length || 5,
    includesPlaceholder: true,
  });

  const effectiveSelectedApprover = useMemo(() => {
    if (!value) return null;
    if (
      selectedApproverCache &&
      selectedApproverCache.email.toLowerCase() === value.toLowerCase()
    ) {
      return selectedApproverCache;
    }
    return approvers.find((a) => a.email.toLowerCase() === value.toLowerCase()) ?? null;
  }, [value, selectedApproverCache, approvers]);

  // Click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [containerRef, isOpen]);

  function handleSelectApprover(approver: ApproverUserItem) {
    if (normalizedDisabledEmails.includes(approver.email.toLowerCase())) {
      return;
    }
    setSelectedApproverCache(approver);
    onChange(approver);
    setSearchTerm('');
    setIsOpen(false);
  }

  function handleClear() {
    setSelectedApproverCache(null);
    onChange(null);
    setSearchTerm('');
    setIsOpen(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        prepareOpenDirection();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredApprovers.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredApprovers.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredApprovers[selectedIndex];
      if (target && !normalizedDisabledEmails.includes(target.email.toLowerCase())) {
        handleSelectApprover(target);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'accent' | 'outline' {
    switch (role.toLowerCase()) {
      case 'super_admin':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'slod':
        return 'accent';
      default:
        return 'outline';
    }
  }

  function formatRoleLabel(role: string): string {
    switch (role.toLowerCase()) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'slod':
        return 'SLOD';
      default:
        return role.toUpperCase();
    }
  }

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="block text-sm font-medium text-text">
          {label} {required && <span className="text-danger">*</span>}
        </label>
        {isLoading && (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Spinner size="sm" className="h-3 w-3" />
            <span>Loading approvers...</span>
          </span>
        )}
      </div>

      {effectiveSelectedApprover ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/[0.04] p-3 shadow-xs transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              avatarObjectKey={effectiveSelectedApprover.avatar_object_key}
              name={effectiveSelectedApprover.name}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-text">
                  {effectiveSelectedApprover.name}
                </p>
                <Badge variant={getRoleBadgeVariant(effectiveSelectedApprover.role)}>
                  {formatRoleLabel(effectiveSelectedApprover.role)}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted">{effectiveSelectedApprover.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Active Reviewer</span>
            </div>
            {!disabled && (
              <button
                type="button"
                aria-label="Remove designated approver"
                onClick={handleClear}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/10 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3.5 flex items-center text-muted">
              <Search className="h-4 w-4" />
            </span>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={`${inputId}-listbox`}
              aria-autocomplete="list"
              value={searchTerm}
              disabled={disabled || isLoading}
              placeholder="Search approver by name or email..."
              onFocus={() => {
                prepareOpenDirection();
                setIsOpen(true);
              }}
              onClick={() => {
                prepareOpenDirection();
                setIsOpen(true);
              }}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                prepareOpenDirection();
                setIsOpen(true);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className={`w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-muted/60 transition focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 ${
                error ? 'border-danger focus:border-danger' : 'border-border focus:border-primary'
              }`}
            />
          </div>

          {isOpen && (
            <div
              id={`${inputId}-listbox`}
              role="listbox"
              aria-label="Approver search results"
              style={{ maxHeight: maxMenuHeight ? `${maxMenuHeight}px` : undefined }}
              className={`absolute left-0 right-0 z-30 max-h-60 overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-lg divide-y divide-border/20 ${
                opensUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
              }`}
            >
              <div className="px-3 py-1.5 text-[11px] font-medium text-muted uppercase tracking-wider bg-background/50 flex items-center justify-between">
                <span>Select Approver</span>
                <span className="text-[10px] lowercase text-muted/80">
                  ↑↓ to navigate · ↵ to select
                </span>
              </div>

              {filteredApprovers.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted">
                  {isLoading
                    ? 'Loading approvers...'
                    : searchTerm
                      ? `No approvers found matching "${searchTerm}".`
                      : 'No approvers available.'}
                </div>
              ) : (
                filteredApprovers.map((approver, index) => {
                  const isSelected = index === selectedIndex;
                  const isAlreadyAssigned = normalizedDisabledEmails.includes(
                    approver.email.toLowerCase(),
                  );
                  return (
                    <div
                      key={approver.auth_user_id}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={isAlreadyAssigned}
                      onClick={() => {
                        if (!isAlreadyAssigned) {
                          handleSelectApprover(approver);
                        }
                      }}
                      onMouseEnter={() => {
                        if (!isAlreadyAssigned) {
                          setSelectedIndex(index);
                        }
                      }}
                      className={`flex items-center gap-3 px-3.5 py-2.5 transition-colors ${
                        isAlreadyAssigned
                          ? 'opacity-50 cursor-not-allowed bg-background/50'
                          : isSelected
                            ? 'bg-primary/10 cursor-pointer'
                            : 'hover:bg-background cursor-pointer'
                      }`}
                    >
                      <Avatar
                        avatarObjectKey={approver.avatar_object_key}
                        name={approver.name}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm leading-tight truncate ${
                              isAlreadyAssigned
                                ? 'text-muted'
                                : isSelected
                                  ? 'font-semibold text-primary'
                                  : 'font-medium text-text'
                            }`}
                          >
                            {approver.name}
                          </p>
                          <Badge variant={getRoleBadgeVariant(approver.role)}>
                            {formatRoleLabel(approver.role)}
                          </Badge>
                          {isAlreadyAssigned && (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted border-border"
                            >
                              Already Assigned
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted truncate">{approver.email}</p>
                      </div>

                      {isSelected && !isAlreadyAssigned && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {helperText && <p className="text-xs text-muted leading-relaxed">{helperText}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
      {isError && (
        <p className="text-xs text-danger">Failed to load approvers. Please refresh the page.</p>
      )}
    </div>
  );
}
