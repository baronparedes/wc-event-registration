export interface FieldOrderControlProps {
  index: number;
  total: number;
  isReorderable: boolean;
  disabled?: boolean;
  onMove: (index: number, direction: 'up' | 'down') => void;
  disabledTooltip?: string;
  itemLabel?: string;
}

/**
 * Reusable reordering buttons (up/down) and sequence indicator for administrative field lists.
 */
export function FieldOrderControl({
  index,
  total,
  isReorderable,
  disabled = false,
  onMove,
  disabledTooltip = 'Reordering is not available',
  itemLabel,
}: FieldOrderControlProps) {
  return (
    <div className="flex items-center gap-1">
      {isReorderable ? (
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() => onMove(index, 'up')}
            disabled={index === 0 || disabled}
            aria-label={itemLabel ? `Move "${itemLabel}" up` : 'Move up'}
            title="Move up"
            className="rounded p-0.5 text-muted hover:bg-muted/20 hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 'down')}
            disabled={index === total - 1 || disabled}
            aria-label={itemLabel ? `Move "${itemLabel}" down` : 'Move down'}
            title="Move down"
            className="rounded p-0.5 text-muted hover:bg-muted/20 hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↓
          </button>
        </div>
      ) : (
        <span className="cursor-not-allowed text-muted/40" title={disabledTooltip}>
          ↑↓
        </span>
      )}
      <span className="ml-1 text-xs text-muted">{index + 1}</span>
    </div>
  );
}
