import { useState } from 'react';

import { Search, ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Dialog,
  FormInputField,
  FormSelectField,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui';
import { Avatar } from '@/components/ui/Avatar';
import {
  type AssignableAdminRole,
  type AuthUserItem,
  useAuthUsersQuery,
  useManageAdminRoleMutation,
} from '@/hooks/domain/auth';
import { useIsMobileViewport } from '@/hooks/utils/useIsMobileViewport';

import { MobileAuthUserCard } from './MobileAuthUserCard';

type AssignRoleDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  assignedAuthUserIds: Set<string>;
};

const ROLE_OPTIONS: Array<{ value: AssignableAdminRole; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'slod', label: 'SLOD' },
  { value: 'imt', label: 'IMT' },
  { value: 'kiosk', label: 'Kiosk' },
];

export function AssignRoleDialog({ isOpen, onClose, assignedAuthUserIds }: AssignRoleDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<AuthUserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<AssignableAdminRole>('admin');

  const { data: authUsers, isLoading: isSearching } = useAuthUsersQuery(searchTerm, isOpen);
  const roleMutation = useManageAdminRoleMutation();
  const isMobileViewport = useIsMobileViewport();

  const FILTER_OPTIONS = [
    { value: 'all', label: 'All Profiles' },
    { value: 'verified', label: 'Verified Only' },
    { value: 'unverified', label: 'Unverified Only' },
    { value: 'assigned', label: 'Assigned Only' },
    { value: 'unassigned', label: 'Unassigned Only' },
  ];

  const filteredAuthUsers = (authUsers || []).filter((user) => {
    const isAssigned = assignedAuthUserIds.has(user.id);
    if (filterType === 'verified') return user.has_member_profile;
    if (filterType === 'unverified') return !user.has_member_profile;
    if (filterType === 'assigned') return isAssigned;
    if (filterType === 'unassigned') return !isAssigned;
    return true;
  });

  function handleClose() {
    setSearchTerm('');
    setFilterType('all');
    setSelectedUser(null);
    setSelectedRole('admin');
    onClose();
  }

  async function handleAssign() {
    if (!selectedUser) return;

    try {
      await roleMutation.mutateAsync({
        action: 'assign',
        auth_user_id: selectedUser.id,
        role: selectedRole,
      });
      toast.success(`Role "${selectedRole}" assigned to ${selectedUser.email}.`);
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign role.';
      toast.error(message);
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="3xl">
      <Dialog.Header showCloseButton>
        <Dialog.Title>Assign Role</Dialog.Title>
        <Dialog.Description>Search users by email and assign them a role.</Dialog.Description>
      </Dialog.Header>

      <Dialog.Body className="flex h-[75vh] flex-col space-y-4">
        {/* Search and Filter Inputs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="auth-user-search" className="block text-sm font-semibold text-text">
              Search Auth Users
            </label>
            <div className="relative">
              <FormInputField
                id="auth-user-search"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                inputClassName="pl-9"
              />
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted" aria-hidden="true" />
            </div>
          </div>
          <div>
            <FormSelectField
              id="auth-user-filter"
              label="Filter Profiles"
              value={filterType}
              onChange={setFilterType}
              options={FILTER_OPTIONS}
              placeholder=""
            />
          </div>
        </div>

        {/* User Search Results List */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-surface">
          {isSearching ? (
            <p className="p-3 text-xs text-muted">Searching auth users...</p>
          ) : filteredAuthUsers.length === 0 ? (
            <p className="p-3 text-xs text-muted">
              {searchTerm || filterType !== 'all'
                ? 'No matching auth users found.'
                : 'Type to search auth users...'}
            </p>
          ) : isMobileViewport ? (
            <div className="space-y-3 p-3 bg-background border-none shadow-none">
              {filteredAuthUsers.map((user) => {
                const isAssigned = assignedAuthUserIds.has(user.id);
                const isSelected = selectedUser?.id === user.id;

                return (
                  <MobileAuthUserCard
                    key={user.id}
                    user={user}
                    isAssigned={isAssigned}
                    isSelected={isSelected}
                    onSelect={setSelectedUser}
                  />
                );
              })}
            </div>
          ) : (
            <ListTable density="dense">
              <ListTableHead>
                <ListTableHeaderRow>
                  <ListTableHeaderCell>Name</ListTableHeaderCell>
                  <ListTableHeaderCell>User Email & ID</ListTableHeaderCell>
                  <ListTableHeaderCell>Status</ListTableHeaderCell>
                </ListTableHeaderRow>
              </ListTableHead>
              <ListTableBody>
                {filteredAuthUsers.map((user) => {
                  const isAssigned = assignedAuthUserIds.has(user.id);
                  const isSelected = selectedUser?.id === user.id;

                  return (
                    <ListTableRow
                      key={user.id}
                      hover="muted"
                      tabIndex={0}
                      aria-selected={isSelected}
                      className={`cursor-pointer ${isSelected ? 'bg-primary/10 ring-1 ring-inset ring-primary/40' : ''}`}
                      onClick={() => setSelectedUser(user)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedUser(user);
                        }
                      }}
                    >
                      <ListTableCell>
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar
                            name={user.name}
                            avatarObjectKey={user.avatar_object_key}
                            size="sm"
                            className="h-8 w-8 shrink-0 text-xs"
                          />
                          <span className="truncate font-medium text-text">{user.name}</span>
                        </div>
                      </ListTableCell>
                      <ListTableCell>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-medium text-text">
                            {user.email}
                            {user.has_member_profile && (
                              <span title="Verified Member Profile">
                                <ShieldCheck
                                  className="h-4 w-4 text-primary shrink-0"
                                  aria-label="Verified Member Profile"
                                />
                              </span>
                            )}
                          </p>
                          <p className="truncate font-mono text-[10px] text-muted">{user.id}</p>
                        </div>
                      </ListTableCell>
                      <ListTableCell>
                        {isAssigned && <Badge variant="outline">Assigned</Badge>}
                      </ListTableCell>
                    </ListTableRow>
                  );
                })}
              </ListTableBody>
            </ListTable>
          )}
        </div>

        {/* Selected User Summary & Role Selection */}
        {selectedUser && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-3">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted">Selected User: </span>
              <span className="font-semibold text-text">{selectedUser.email}</span>
              {selectedUser.has_member_profile && (
                <span title="Verified Member Profile">
                  <ShieldCheck
                    className="h-4 w-4 text-primary shrink-0"
                    aria-label="Verified Member Profile"
                  />
                </span>
              )}
            </div>

            <FormSelectField
              label="Select Role to Assign"
              value={selectedRole}
              onChange={(val) => setSelectedRole(val as AssignableAdminRole)}
              options={ROLE_OPTIONS}
            />
          </div>
        )}

        {/* Dialog Actions */}
        <Dialog.Footer className="mt-auto">
          <Button type="button" variant="primaryOutline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!selectedUser || roleMutation.isPending}
            onClick={handleAssign}
            className="gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span>{roleMutation.isPending ? 'Assigning...' : 'Assign Role'}</span>
          </Button>
        </Dialog.Footer>
      </Dialog.Body>
    </Dialog>
  );
}
