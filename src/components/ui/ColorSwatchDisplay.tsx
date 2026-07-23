type ColorSwatchDisplayProps = {
  value: string;
  fullWidth?: boolean;
};

/** Renders a color swatch for color_picker field values. */
export function ColorSwatchDisplay({ value, fullWidth = false }: ColorSwatchDisplayProps) {
  if (value === '—') {
    return <span>—</span>;
  }

  if (fullWidth) {
    return (
      <span
        className="block h-12 w-full rounded border border-border"
        style={{ backgroundColor: value }}
        title={value}
      />
    );
  }

  return (
    <span
      className="inline-block h-8 w-8 shrink-0 rounded border border-border"
      style={{ backgroundColor: value }}
      title={value}
    />
  );
}
