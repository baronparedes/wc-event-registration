type ColorSwatchDisplayProps = {
  value: string;
  fullWidth?: boolean;
};

/** Renders a color swatch for color_picker field values. */
export function ColorSwatchDisplay({ value, fullWidth = false }: ColorSwatchDisplayProps) {
  if (value === '—') {
    return <span>—</span>;
  }

  const swatchStyle = {
    backgroundColor: value,
    '--print-swatch-color': value,
  } as React.CSSProperties;

  if (fullWidth) {
    return (
      <span
        className="print-color-swatch block h-12 w-full rounded border border-border"
        style={swatchStyle}
        title={value}
      />
    );
  }

  return (
    <span
      className="print-color-swatch inline-block h-8 w-8 shrink-0 rounded border border-border"
      style={swatchStyle}
      title={value}
    />
  );
}
