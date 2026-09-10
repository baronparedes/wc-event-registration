import { useState } from 'react';

import { toast } from 'sonner';

import { Button, Dialog, FormSelectField } from '@/components/ui';
import {
  type AdminRoleAssignment,
  type AssignableAdminRole,
  useManageAdminRoleMutation,
} from '@/hooks/domain/auth';

type EditRoleDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  assignment: AdminRoleAssignment | null;
};

const ROLE_OPTIONS: Array<{ value: AssignableAdminRole; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'slod', label: 'SLOD' },
  { value: 'imt', label: 'IMT' },
  { value: 'kiosk', label: 'Kiosk' },
];

export function EditRoleDialog({ isOpen, onClose, assignment }: EditRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<AssignableAdminRole | null>(null);
  const roleMutation = useManageAdminRoleMutation();

  if (!assignment) return null;

  const currentRole =
    assignment.role !== 'super_admin' ? (assignment.role as AssignableAdminRole) : 'admin';
  const role = selectedRole ?? currentRole;

  function handleClose() {
    setSelectedRole(null);
    onClose();
  }

  async function handleUpdate() {
    if (!assignment) return;

    try {
      await roleMutation.mutateAsync({
        action: 'update',
        admin_id: assignment.id,
        role,
      });
      toast.success(`Role for ${assignment.email} updated to "${role}".`);
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update role.';
      toast.error(message);
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Assigned Role"
      description={`Change application role for ${assignment.email}`}
      maxWidthClass="max-w-md"
      showCloseIcon
    >
      <div className="space-y-4">
        <div className="text-xs space-y-1 rounded-lg border border-border bg-muted/20 p-3">
          <p>
            <span className="text-muted">User Email:</span>{' '}
            <span className="font-semibold text-text">{assignment.email}</span>
          </p>
          <p>
            <span className="text-muted">Current Role:</span>{' '}
            <span className="font-semibold capitalize text-text">{assignment.role}</span>
          </p>
        </div>

        <FormSelectField
          label="New Role"
          value={role}
          onChange={(val) => setSelectedRole(val as AssignableAdminRole)}
          options={ROLE_OPTIONS}
        />

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button type="button" variant="primaryOutline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={roleMutation.isPending || role === assignment.role}
            onClick={handleUpdate}
          >
            {roleMutation.isPending ? 'Updating...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
