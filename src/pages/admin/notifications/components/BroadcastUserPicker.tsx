import { useEffect, useRef, useState } from 'react';

import { AtSign, Check, X } from 'lucide-react';

import { Avatar, Badge } from '@/components/ui';
import { type AuthUserItem, useAuthUsersQuery } from '@/hooks/domain/auth';
import { useDebounceSearch, useDropdownPlacement } from '@/hooks/utils';

export interface BroadcastUserPickerProps {
  id?: string;
  value?: string;
  onChange: (userId: string, user?: AuthUserItem | null) => void;
  error?: string;
}

export function BroadcastUserPicker({
  id = 'targetUserId',
  value = '',
  onChange,
  error,
}: BroadcastUserPickerProps) {
  const { searchTerm, setSearchTerm, debouncedSearchTerm } = useDebounceSearch({
    delayMs: 300,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedUserCache, setSelectedUserCache] = useState<AuthUserItem | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Clean search query (strip leading @ if present)
  const query = debouncedSearchTerm.startsWith('@')
    ? debouncedSearchTerm.slice(1)
    : debouncedSearchTerm;
  const { data: authUsers = [], isLoading, isFetching } = useAuthUsersQuery(query, true);

  const isDebouncing = searchTerm.trim() !== debouncedSearchTerm.trim();
  const isSearchActive = isLoading || isFetching || isDebouncing;

  const { containerRef, opensUpward, prepareOpenDirection } = useDropdownPlacement({
    isOpen,
    optionCount: authUsers.length || 5,
    includesPlaceholder: true,
  });

  const effectiveSelectedUser = value
    ? selectedUserCache?.id === value
      ? selectedUserCache
      : (authUsers.find((u) => u.id === value) ?? null)
    : null;

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [containerRef]);

  const filteredUsers = authUsers;

  const handleSelectUser = (user: AuthUserItem) => {
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
      setSelectedIndex((prev) => (prev + 1 < filteredUsers.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredUsers.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredUsers[selectedIndex]) {
        handleSelectUser(filteredUsers[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label htmlFor={id} className="block text-sm font-medium text-text">
        Target User <span className="text-red-500">*</span>
      </label>

      {value && effectiveSelectedUser ? (
        <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/[0.04] p-3 shadow-xs transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              name={effectiveSelectedUser.name || effectiveSelectedUser.email}
              avatarObjectKey={effectiveSelectedUser.avatar_object_key}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text truncate">
                  {effectiveSelectedUser.name}
                </p>
                {effectiveSelectedUser.has_member_profile && (
                  <Badge variant="primaryOutline" className="text-[10px] px-1.5 py-0.5">
                    Member
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted truncate">{effectiveSelectedUser.email}</p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Remove selected user"
            onClick={handleClear}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/10 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" />
          </button>
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
              value={searchTerm}
              placeholder="Search user by name or email (or type @)..."
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
              className={`w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-muted/60 transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                error ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
              }`}
            />
            {isSearchActive && (
              <span className="absolute right-3.5 text-xs text-muted animate-pulse">
                Searching...
              </span>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && (
            <div
              id={`${id}-listbox`}
              role="listbox"
              aria-label="User search results"
              className={`absolute left-0 right-0 z-30 max-h-60 overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-lg divide-y divide-border/20 ${
                opensUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
              }`}
            >
              <div className="px-3 py-1.5 text-[11px] font-medium text-muted uppercase tracking-wider bg-background/50 flex items-center justify-between">
                <span>Select User</span>
                <span className="text-[10px] lowercase text-muted/80">
                  ↑↓ to navigate · ↵ to select
                </span>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted">
                  {isSearchActive ? 'Searching...' : 'No users found matching query.'}
                </div>
              ) : (
                filteredUsers.map((user, index) => {
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
                        name={user.name || user.email}
                        avatarObjectKey={user.avatar_object_key}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p
                            className={`text-sm leading-tight truncate ${
                              isSelected ? 'font-semibold text-primary' : 'font-medium text-text'
                            }`}
                          >
                            {user.name}
                          </p>
                          {user.has_member_profile && (
                            <Badge variant="primaryOutline" className="text-[9px] px-1 py-0.2">
                              Member
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted truncate">{user.email}</p>
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

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
