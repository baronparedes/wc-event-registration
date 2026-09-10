import { useState } from 'react';

import { Edit2, LockKeyhole, Shield, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import {
  Badge,
  Button,
  ConfirmDialog,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui';
import { ActionButton } from '@/components/ui/ActionLink';
import { Avatar } from '@/components/ui/Avatar';
import {
  type AdminRole,
  type AdminRoleAssignment,
  useAdminRolesQuery,
  useRevokeAdminRoleMutation,
} from '@/hooks/domain/auth';

import { AssignRoleDialog } from './components/AssignRoleDialog';
import { EditRoleDialog } from './components/EditRoleDialog';

function getRoleBadgeVariant(role: AdminRole): 'open' | 'upcoming' | 'closed' | 'error' | 'guest' {
  switch (role) {
    case 'super_admin':
      return 'upcoming';
    case 'admin':
      return 'open';
    case 'slod':
      return 'guest';
    case 'imt':
      return 'open';
    case 'kiosk':
      return 'closed';
    default:
      return 'closed';
  }
}

export function AdminUserRolesPage() {
  const { data: assignments, isLoading, error } = useAdminRolesQuery();
  const revokeMutation = useRevokeAdminRoleMutation();

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AdminRoleAssignment | null>(null);
  const [revokingAssignment, setRevokingAssignment] = useState<AdminRoleAssignment | null>(null);

  const assignedAuthUserIds = new Set(assignments?.map((a) => a.auth_user_id) ?? []);

  async function handleRevoke() {
    if (!revokingAssignment) return;

    try {
      await revokeMutation.mutateAsync({ adminId: revokingAssignment.id });
      toast.success(`Role for ${revokingAssignment.email} has been revoked.`);
      setRevokingAssignment(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke role.';
      toast.error(message);
    }
  }

  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="User Roles"
        description="Assign and manage application roles for users."
        breadcrumbs={[{ label: 'User Roles' }]}
        actions={
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setIsAssignDialogOpen(true)}
            className="gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span>Assign Role to User</span>
          </Button>
        }
      />

      <AdminBaseNavigation />

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading assigned roles...">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Failed to load assigned user roles: {error.message}
          </div>
        ) : !assignments || assignments.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center space-y-3">
            <Shield className="mx-auto h-10 w-10 text-muted" aria-hidden="true" />
            <h3 className="font-heading text-lg font-semibold text-text">No roles assigned</h3>
            <p className="text-sm text-muted">
              Click &quot;Assign Role to User&quot; to assign a role to a user.
            </p>
            <Button
              type="button"
              variant="primaryOutline"
              size="sm"
              onClick={() => setIsAssignDialogOpen(true)}
            >
              Assign Role to User
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
            <ListTable>
              <ListTableHead>
                <ListTableHeaderRow>
                  <ListTableHeaderCell>Name</ListTableHeaderCell>
                  <ListTableHeaderCell>User Email & ID</ListTableHeaderCell>
                  <ListTableHeaderCell>Assigned Role</ListTableHeaderCell>
                  <ListTableHeaderCell>Assigned Date</ListTableHeaderCell>
                  <ListTableHeaderCell className="text-right">Actions</ListTableHeaderCell>
                </ListTableHeaderRow>
              </ListTableHead>
              <ListTableBody>
                {assignments.map((assignment) => {
                  const isSuperAdmin = assignment.role === 'super_admin';
                  const formattedDate = new Date(assignment.created_at).toLocaleDateString(
                    undefined,
                    {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    },
                  );

                  return (
                    <ListTableRow key={assignment.id}>
                      <ListTableCell>
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={assignment.name}
                            avatarObjectKey={assignment.avatar_object_key}
                            size="sm"
                            className="h-8 w-8 text-xs"
                          />
                          <span className="font-medium text-text">{assignment.name}</span>
                        </div>
                      </ListTableCell>
                      <ListTableCell>
                        <div>
                          <p className="font-medium text-text">{assignment.email}</p>
                          <p className="text-xs text-muted font-mono">{assignment.auth_user_id}</p>
                        </div>
                      </ListTableCell>
                      <ListTableCell>
                        <Badge variant={getRoleBadgeVariant(assignment.role)}>
                          <span className="uppercase tracking-wider font-semibold">
                            {assignment.role}
                          </span>
                        </Badge>
                      </ListTableCell>
                      <ListTableCell className="text-xs text-muted">{formattedDate}</ListTableCell>
                      <ListTableCell className="text-right">
                        {isSuperAdmin ? (
                          <span
                            className="inline-flex items-center justify-end text-muted"
                            aria-label="Protected"
                            title="Protected"
                          >
                            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
                            <span className="sr-only">Protected</span>
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-3">
                            <ActionButton
                              type="button"
                              aria-label={`Edit role for ${assignment.email}`}
                              title="Edit role"
                              onClick={() => setEditingAssignment(assignment)}
                            >
                              <Edit2 className="h-5 w-5" aria-hidden="true" />
                            </ActionButton>
                            <ActionButton
                              type="button"
                              variant="destructive"
                              aria-label={`Revoke role for ${assignment.email}`}
                              title="Revoke role"
                              onClick={() => setRevokingAssignment(assignment)}
                            >
                              <Trash2 className="h-5 w-5" aria-hidden="true" />
                            </ActionButton>
                          </div>
                        )}
                      </ListTableCell>
                    </ListTableRow>
                  );
                })}
              </ListTableBody>
            </ListTable>
          </div>
        )}
      </AdminPageShell.Content>

      {/* Dialogs */}
      <AssignRoleDialog
        isOpen={isAssignDialogOpen}
        onClose={() => setIsAssignDialogOpen(false)}
        assignedAuthUserIds={assignedAuthUserIds}
      />

      <EditRoleDialog
        isOpen={Boolean(editingAssignment)}
        onClose={() => setEditingAssignment(null)}
        assignment={editingAssignment}
      />

      <ConfirmDialog
        isOpen={Boolean(revokingAssignment)}
        title="Revoke User Role"
        description={`Are you sure you want to revoke the "${revokingAssignment?.role}" role from ${revokingAssignment?.email}? The user will revert to standard member permissions.`}
        confirmLabel="Revoke Role"
        confirmLoadingLabel="Revoking..."
        confirmVariant="destructive"
        isPending={revokeMutation.isPending}
        onConfirm={handleRevoke}
        onCancel={() => setRevokingAssignment(null)}
      />
    </AdminPageShell>
  );
}
