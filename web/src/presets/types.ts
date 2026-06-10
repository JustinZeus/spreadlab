import type { Config, Strategy } from '@/types/engine'

// Frontend-only presentation types (spec section 1). They describe study
// copy and the initial scenario set, not simulation data: Config, Result
// and Strategy stay imported from the generated types.

export interface PanelSpec {
  id: string // stable client id
  label: string // user editable
  strategy: Strategy
  overrides: Partial<Config> // sparse diff against the base config
}

export interface StudyPreset {
  headline: string // hero h1
  // Hero paragraph; {0} {1} {2}... placeholders are replaced by each
  // panel's reached%, formatted by the shared formatPct.
  narrative: string
  disclaimerShort: string // badge text
  disclaimerLong: string // About popover body
  toneThresholdPct: number // reached% <= threshold renders "good" (teal)
  base: Config // the default world
  panels: PanelSpec[] // initial panels
}

export const MAX_PANELS = 6
