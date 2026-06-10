import type { Config, Strategy } from '@/types/engine'
import { StrategyMostConnected, StrategyNone, StrategyRandom } from '@/types/engine'
import { MAX_PANELS, type PanelSpec, type StudyPreset } from '@/presets/types'

// URL state scheme (spec section 7): human-readable query parameters.
// Base fields appear by JSON name only when they differ from the preset;
// each panel is one repeated `panel=label~strategy~overrides` param,
// omitted entirely while the panel set equals the preset's; `focus=` holds
// the focused panel index. Unknown params are ignored; anything malformed
// makes the whole parse fail so the app falls back to the preset.

const KNOWN_STRATEGIES: readonly Strategy[] = [StrategyNone, StrategyRandom, StrategyMostConnected]

export interface ParsedUrlState {
  base: Config
  panels: PanelSpec[]
  focusIndex: number | null
}

// The runtime base config carries exactly the generated Config fields, so
// deriving names from it stays in sync with the Go structs automatically.
function configFieldNames(base: Config): (keyof Config)[] {
  return Object.keys(base) as (keyof Config)[]
}

function isConfigField(base: Config, name: string): name is keyof Config {
  return Object.hasOwn(base, name)
}

function encodePanelLabel(label: string): string {
  // encodeURIComponent leaves ~ alone, but ~ is our segment separator.
  return encodeURIComponent(label).replaceAll('~', '%7E')
}

function encodePanel(panel: PanelSpec): string {
  const overridePairs = Object.entries(panel.overrides).map(([field, value]) => `${field}:${value}`)
  return `${encodePanelLabel(panel.label)}~${panel.strategy}~${overridePairs.join(',')}`
}

function overridesEqual(a: Partial<Config>, b: Partial<Config>): boolean {
  const aFields = Object.keys(a) as (keyof Config)[]
  return aFields.length === Object.keys(b).length && aFields.every((field) => a[field] === b[field])
}

function panelsMatchPreset(panels: PanelSpec[], preset: StudyPreset): boolean {
  return (
    panels.length === preset.panels.length &&
    panels.every((panel, index) => {
      const presetPanel = preset.panels[index]
      return (
        presetPanel !== undefined &&
        panel.label === presetPanel.label &&
        panel.strategy === presetPanel.strategy &&
        overridesEqual(panel.overrides, presetPanel.overrides)
      )
    })
  )
}

export function serializeUrlState(
  base: Config,
  panels: PanelSpec[],
  focusPanelId: string | null,
  preset: StudyPreset,
): string {
  const parts: string[] = []
  for (const field of configFieldNames(base)) {
    if (base[field] !== preset.base[field]) parts.push(`${field}=${base[field]}`)
  }
  if (!panelsMatchPreset(panels, preset)) {
    for (const panel of panels) parts.push(`panel=${encodePanel(panel)}`)
  }
  if (focusPanelId !== null) {
    const focusIndex = panels.findIndex((panel) => panel.id === focusPanelId)
    if (focusIndex >= 0) parts.push(`focus=${focusIndex}`)
  }
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

function decodePanel(
  base: Config,
  rawValue: string,
  createPanelId: () => string,
): PanelSpec | null {
  const segments = rawValue.split('~')
  if (segments.length !== 3) return null
  const [rawLabel = '', strategy = '', rawOverrides = ''] = segments
  let label: string
  try {
    label = decodeURIComponent(rawLabel)
  } catch {
    return null
  }
  if (label === '') return null
  if (!KNOWN_STRATEGIES.includes(strategy)) return null
  const overrides: Partial<Config> = {}
  if (rawOverrides !== '') {
    for (const pair of rawOverrides.split(',')) {
      const colonAt = pair.indexOf(':')
      if (colonAt < 0) return null
      const field = pair.slice(0, colonAt)
      const value = Number(pair.slice(colonAt + 1))
      if (!isConfigField(base, field) || !Number.isFinite(value)) return null
      overrides[field] = value
    }
  }
  return { id: createPanelId(), label, strategy, overrides }
}

export function parseUrlState(
  search: string,
  preset: StudyPreset,
  createPanelId: () => string,
): ParsedUrlState | null {
  const query = search.startsWith('?') ? search.slice(1) : search
  const base: Config = { ...preset.base }
  const urlPanels: PanelSpec[] = []
  let sawPanelParam = false
  let focusIndex: number | null = null

  for (const rawParam of query.split('&')) {
    if (rawParam === '') continue
    const equalsAt = rawParam.indexOf('=')
    if (equalsAt < 0) continue // bare keys are ignored like unknown params
    const key = rawParam.slice(0, equalsAt)
    const rawValue = rawParam.slice(equalsAt + 1)
    if (key === 'panel') {
      sawPanelParam = true
      const panel = decodePanel(base, rawValue, createPanelId)
      if (panel === null) return null
      urlPanels.push(panel)
    } else if (key === 'focus') {
      const parsedIndex = Number(rawValue)
      if (rawValue === '' || !Number.isInteger(parsedIndex) || parsedIndex < 0) return null
      focusIndex = parsedIndex
    } else if (isConfigField(base, key)) {
      const value = Number(rawValue)
      if (rawValue === '' || !Number.isFinite(value)) return null
      base[key] = value
    }
  }

  if (sawPanelParam && urlPanels.length > MAX_PANELS) return null
  const panels = sawPanelParam
    ? urlPanels
    : preset.panels.map((panel) => ({
        ...panel,
        id: createPanelId(),
        overrides: { ...panel.overrides },
      }))
  if (focusIndex !== null && focusIndex >= panels.length) return null
  return { base, panels, focusIndex }
}
