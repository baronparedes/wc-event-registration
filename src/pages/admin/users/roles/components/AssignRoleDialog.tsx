import { useState } from 'react';

import { Search, UserPlus } from 'lucide-react';
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
  useAssignAdminRoleMutation,
  useAuthUsersQuery,
} from '@/hooks/domain/auth';

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
  const [selectedUser, setSelectedUser] = useState<AuthUserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<AssignableAdminRole>('admin');

  const { data: authUsers, isLoading: isSearching } = useAuthUsersQuery(searchTerm, isOpen);
  const assignMutation = useAssignAdminRoleMutation();

  function handleClose() {
    setSearchTerm('');
    setSelectedUser(null);
    setSelectedRole('admin');
    onClose();
  }

  async function handleAssign() {
    if (!selectedUser) return;

    try {
      await assignMutation.mutateAsync({
        authUserId: selectedUser.id,
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
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Assign Role"
      description="Search users by email and assign them a role."
      maxWidthClass="max-w-3xl"
      showCloseIcon
    >
      <div className="space-y-4">
        {/* Search Input */}
        <div>
          <label htmlFor="auth-user-search" className="block text-xs font-semibold text-text mb-1">
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
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden="true" />
          </div>
        </div>

        {/* User Search Results List */}
        <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-surface">
          {isSearching ? (
            <p className="p-3 text-xs text-muted">Searching auth users...</p>
          ) : !authUsers || authUsers.length === 0 ? (
            <p className="p-3 text-xs text-muted">
              {searchTerm ? 'No matching auth users found.' : 'Type to search auth users...'}
            </p>
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
                {authUsers.map((user) => {
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
                          <p className="truncate font-medium text-text">{user.email}</p>
                          <p className="truncate font-mono text-[10px] text-muted">{user.id}</p>
                        </div>
                      </ListTableCell>
                      <ListTableCell>
                        {isAssigned && <Badge variant="closed">Assigned</Badge>}
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
            <div className="text-xs">
              <span className="text-muted">Selected User: </span>
              <span className="font-semibold text-text">{selectedUser.email}</span>
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
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button type="button" variant="primaryOutline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!selectedUser || assignMutation.isPending}
            onClick={handleAssign}
            className="gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span>{assignMutation.isPending ? 'Assigning...' : 'Assign Role'}</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
