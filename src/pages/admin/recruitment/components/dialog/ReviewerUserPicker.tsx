import { useEffect, useRef, useState } from 'react';

import { AtSign, Check, X } from 'lucide-react';

import { Avatar, Badge } from '@/components/ui';
import { useReviewerUserByIdQuery, useReviewerUsersQuery } from '@/hooks/domain/recruitment';
import { useDebounceSearch, useDropdownPlacement } from '@/hooks/utils';
import type { ReviewerUserItem } from '@/lib/domain/recruitment';

export interface ReviewerUserPickerProps {
  id?: string;
  value?: string;
  reviewerName?: string;
  onChange: (userId: string, user?: ReviewerUserItem | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

export function ReviewerUserPicker({
  id = 'assignedReviewerPicker',
  value = '',
  reviewerName = '',
  onChange,
  label = 'Assigned Reviewer / Coach',
  placeholder = 'Search coach or leave blank (assign on service day)...',
  required = true,
  error,
  disabled = false,
}: ReviewerUserPickerProps) {
  const { searchTerm, setSearchTerm, debouncedSearchTerm } = useDebounceSearch({
    delayMs: 300,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedUserCache, setSelectedUserCache] = useState<ReviewerUserItem | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Clean search query (strip leading @ if present)
  const query = debouncedSearchTerm.startsWith('@')
    ? debouncedSearchTerm.slice(1)
    : debouncedSearchTerm;

  const { data: users = [], isLoading, isFetching } = useReviewerUsersQuery(query, !disabled);
  const { data: userById } = useReviewerUserByIdQuery(value, !selectedUserCache && Boolean(value));

  const isDebouncing = searchTerm.trim() !== debouncedSearchTerm.trim();
  const isSearchActive = isLoading || isFetching || isDebouncing;

  const { containerRef, opensUpward, prepareOpenDirection } = useDropdownPlacement({
    isOpen,
    optionCount: users.length || 5,
    includesPlaceholder: true,
  });

  let effectiveSelectedUser: ReviewerUserItem | null = null;
  if (value) {
    if (selectedUserCache?.id === value) {
      effectiveSelectedUser = selectedUserCache;
    } else {
      effectiveSelectedUser =
        users.find((u) => u.id === value) ??
        userById ??
        (reviewerName
          ? {
              id: value,
              name: reviewerName,
              full_name: reviewerName,
              nickname: null,
              email: null,
              role: null,
              avatar_object_key: null,
            }
          : null);
    }
  } else if (reviewerName) {
    effectiveSelectedUser = {
      id: '',
      name: reviewerName,
      full_name: reviewerName,
      nickname: null,
      email: null,
      role: null,
      avatar_object_key: null,
    };
  }

  // Click outside to close dropdown (guarded against inactive event listeners per React anti-patterns)
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

  const handleSelectUser = (user: ReviewerUserItem) => {
    setSelectedUserCache(user);
    onChange(user.id, user);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedUserCache(null);
    onChange('', null);
    setSearchTerm('');
    setIsOpen(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        prepareOpenDirection();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < users.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : users.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (users[selectedIndex]) {
        handleSelectUser(users[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-text">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}

      {(value || reviewerName) && effectiveSelectedUser ? (
        <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/[0.04] p-2.5 min-h-[46px] shadow-xs transition-all">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              name={effectiveSelectedUser.name || effectiveSelectedUser.full_name}
              avatarObjectKey={effectiveSelectedUser.avatar_object_key}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text truncate">
                  {effectiveSelectedUser.name || effectiveSelectedUser.full_name}
                </p>
                {effectiveSelectedUser.role && (
                  <Badge variant="secondary" className="text-[10px] py-0 px-2 shrink-0">
                    {effectiveSelectedUser.role}
                  </Badge>
                )}
              </div>
              {effectiveSelectedUser.email && (
                <p className="text-xs text-muted truncate">{effectiveSelectedUser.email}</p>
              )}
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              aria-label="Remove assigned reviewer"
              onClick={handleClear}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/10 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3.5 flex items-center text-muted">
              <AtSign className="h-4 w-4" />
            </span>
            <input
              ref={inputRef}
              id={id}
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={`${id}-listbox`}
              aria-autocomplete="list"
              disabled={disabled}
              value={searchTerm}
              placeholder={placeholder}
              onFocus={() => {
                if (disabled) return;
                prepareOpenDirection();
                setIsOpen(true);
              }}
              onClick={() => {
                if (disabled) return;
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
              className={`w-full rounded-md border bg-background pl-10 pr-4 py-2.5 text-sm leading-6 text-text placeholder:text-muted/60 transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                error ? 'border-danger focus:border-danger' : 'border-border focus:border-primary'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {isSearchActive && (
              <span className="absolute right-3.5 text-xs text-muted animate-pulse">
                Searching...
              </span>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && !disabled && (
            <div
              id={`${id}-listbox`}
              role="listbox"
              aria-label="Reviewer search results"
              className={`absolute left-0 right-0 z-30 max-h-60 overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-lg divide-y divide-border/20 ${
                opensUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
              }`}
            >
              <div className="px-3 py-1.5 text-[11px] font-medium text-muted uppercase tracking-wider bg-background/50 flex items-center justify-between">
                <span>Select Reviewer / Coach</span>
                <span className="text-[10px] lowercase text-muted/80">
                  ↑↓ to navigate · ↵ to select
                </span>
              </div>

              {users.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted">
                  {isSearchActive ? 'Searching...' : 'No users found matching query.'}
                </div>
              ) : (
                users.map((user, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={user.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectUser(user)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10' : 'hover:bg-background'
                      }`}
                    >
                      <Avatar
                        name={user.name || user.full_name}
                        avatarObjectKey={user.avatar_object_key}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm leading-tight truncate ${
                              isSelected ? 'font-semibold text-primary' : 'font-medium text-text'
                            }`}
                          >
                            {user.name || user.full_name}
                          </p>
                          {user.role && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-2 shrink-0">
                              {user.role}
                            </Badge>
                          )}
                        </div>
                        {user.email && <p className="text-xs text-muted truncate">{user.email}</p>}
                      </div>

                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
