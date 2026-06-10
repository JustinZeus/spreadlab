// The single rounding rule for percentages (spec section 6): round to a
// whole percent. Every surface (hero, panels, strip, chart labels, table)
// goes through here so 99/120 reads as 83% everywhere, never 82%.

export function roundPct(percent: number): number {
  return Math.round(percent)
}

export function formatPct(percent: number): string {
  return `${roundPct(percent)}%`
}
