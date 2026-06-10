// Panel accent palette (spec section 6): categorical and deliberately
// distinct from the rose/teal node semantics. Assigned by panel position,
// recycled on remove.
export const PANEL_ACCENTS = [
  '#6366F1',
  '#F59E0B',
  '#0EA5E9',
  '#8B5CF6',
  '#EC4899',
  '#84CC16',
] as const

export function accentForPanel(panelIndex: number): string {
  return PANEL_ACCENTS[panelIndex % PANEL_ACCENTS.length] ?? PANEL_ACCENTS[0]
}
