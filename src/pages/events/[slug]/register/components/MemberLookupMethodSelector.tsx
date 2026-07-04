import { Button } from '@/components/ui/Button';

type MemberLookupMethodSelectorProps = {
  allowNameLookup: boolean;
  isLookupPending: boolean;
  onSelectMethod: (method: 'id' | 'name') => void;
};

/**
 * Component for choosing how to lookup a member: by ID or by name.
 * Shown as the initial step (Step 1) before executing the chosen method.
 */
export function MemberLookupMethodSelector({
  allowNameLookup,
  isLookupPending,
  onSelectMethod,
}: MemberLookupMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          type="button"
          onClick={() => onSelectMethod('id')}
          disabled={isLookupPending}
          variant="default"
          size="md"
          className="h-auto flex-col py-4 !bg-primary/75"
        >
          <span className="font-semibold text-lg">Scan via RFID reader</span>
          <br />
          <span className="mt-1 text-sm font-normal opacity-90">
            or enter your Member ID manually
          </span>
        </Button>

        {allowNameLookup && (
          <Button
            type="button"
            onClick={() => onSelectMethod('name')}
            disabled={isLookupPending}
            variant="default"
            size="md"
            className="h-auto flex-col py-4 !bg-primary/75"
          >
            <span className="font-semibold text-lg">Search by my name</span>
            <br />
            <span className="mt-1 text-sm font-normal opacity-90">
              Find your profile using your registered full name
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
