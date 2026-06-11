import { reactive } from 'vue'
import { ApiError, fetchDefaultConfig, runScenario } from '@/lib/api'
import { clampConfig, clampConfigField } from '@/lib/bounds'
import { roundPct } from '@/lib/format'
import { graphKey } from '@/lib/graph'
import { parseUrlState, serializeUrlState } from '@/lib/urlState'
import { deepfakeSchoolPreset } from '@/presets/deepfake-school'
import { MAX_PANELS, type PanelSpec, type StudyPreset } from '@/presets/types'
import type { Bounds, Config, Result, Strategy } from '@/types/engine'
import { StrategyNone } from '@/types/engine'

// The one store (spec section 4): a plain reactive module singleton, no
// Pinia. All scenario runs flow through here: input changes mutate state
// immediately, runs are debounced 400 ms, requests go out in parallel, and
// results swap in atomically only when every request succeeded. On failure
// the last good results stay on screen.

export const RUN_DEBOUNCE_MS = 400

export type RunState = 'idle' | 'running' | 'error'
export type PlaybackSpeed = 0.5 | 1 | 2

export interface SimState {
  base: Config
  // The engine's field bounds, fetched at startup; null until they arrive
  // (or when the fetch failed, in which case the engine's own validation
  // is the backstop and nothing clamps client-side).
  bounds: Bounds | null
  panels: PanelSpec[]
  resultsByPanelId: Record<string, Result>
  edgesByGraphHash: Record<string, number[][]>
  round: number
  // How far the current round's transition has played, 0..1. Outside
  // playback it is 1: the round is fully displayed.
  roundProgress: number
  playing: boolean
  speed: PlaybackSpeed
  focusPanelId: string | null
  editingPanelId: string | null // panel whose editor popover is open
  failedPanelIds: Set<string> // panels whose latest request failed (rose kebab dot)
  hoveredNode: number | null
  runState: RunState
  errorMessage: string | null // network/server failure, shown in the ErrorBanner
  validationError: string | null // 400 from the engine, shown inline under the controls
  urlStateInvalid: boolean // the opened link held malformed state; preset shown instead
  announcement: string // text for the single polite live region (spec section 8)
}

function createPanelId(): string {
  return crypto.randomUUID()
}

function clonePanel(panel: PanelSpec): PanelSpec {
  return { ...panel, overrides: { ...panel.overrides } }
}

export function createSimStore(preset: StudyPreset = deepfakeSchoolPreset) {
  const state: SimState = reactive({
    base: { ...preset.base },
    bounds: null,
    panels: preset.panels.map(clonePanel),
    resultsByPanelId: {},
    edgesByGraphHash: {},
    round: 0,
    roundProgress: 1,
    playing: false,
    speed: 1,
    focusPanelId: null,
    editingPanelId: null,
    failedPanelIds: new Set<string>(),
    hoveredNode: null,
    runState: 'idle',
    errorMessage: null,
    validationError: null,
    urlStateInvalid: false,
    announcement: '',
  })

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  // null accumulates to "all panels"; a set collects single-panel reruns.
  let pendingPanelIds: Set<string> | null = new Set()
  let runCounter = 0
  // A panel's result may only be written by the latest run that requested
  // it; older in-flight responses for the same panel are dropped.
  const latestRunIdByPanelId = new Map<string, number>()

  function effectiveConfig(panel: PanelSpec): Config {
    return { ...state.base, ...panel.overrides }
  }

  function panelById(panelId: string): PanelSpec | undefined {
    return state.panels.find((panel) => panel.id === panelId)
  }

  function maxRounds(): number {
    return state.panels.reduce((roundsSoFar, panel) => {
      const result = state.resultsByPanelId[panel.id]
      return result ? Math.max(roundsSoFar, result.numRounds) : roundsSoFar
    }, 0)
  }

  // One spoken line per state of the world, e.g. "No program 83 percent,
  // Random picks 58 percent". Used by the live region for run updates and
  // by playback for the final announcement.
  function resultsSummary(): string {
    return state.panels
      .map((panel) => {
        const result = state.resultsByPanelId[panel.id]
        return result ? `${panel.label} ${roundPct(result.reachedPct)} percent` : null
      })
      .filter(Boolean)
      .join(', ')
  }

  function scheduleRun(panelId?: string) {
    if (panelId === undefined) {
      pendingPanelIds = null
    } else if (pendingPanelIds !== null) {
      pendingPanelIds.add(panelId)
    }
    if (debounceTimer !== null) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      const panelIds = pendingPanelIds
      pendingPanelIds = new Set()
      void runPanels(panelIds)
    }, RUN_DEBOUNCE_MS)
  }

  async function runPanels(panelIds: Set<string> | null): Promise<void> {
    const targets =
      panelIds === null ? [...state.panels] : state.panels.filter((panel) => panelIds.has(panel.id))
    if (targets.length === 0) return
    const runId = ++runCounter
    for (const panel of targets) latestRunIdByPanelId.set(panel.id, runId)
    state.runState = 'running'

    const settled = await Promise.allSettled(
      targets.map((panel) =>
        runScenario({ config: effectiveConfig(panel), strategy: panel.strategy }),
      ),
    )

    const isLatestRun = runId === runCounter
    const firstFailure = settled.find(
      (outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected',
    )
    if (firstFailure) {
      // Keep the last good results untouched; only the latest run may
      // surface its error.
      if (!isLatestRun) return
      settled.forEach((outcome, index) => {
        const panel = targets[index]
        if (panel && outcome.status === 'rejected') state.failedPanelIds.add(panel.id)
      })
      const reason: unknown = firstFailure.reason
      state.runState = 'error'
      if (reason instanceof ApiError && reason.status === 400) {
        state.validationError = reason.message
        state.errorMessage = null
      } else {
        state.errorMessage = reason instanceof Error ? reason.message : String(reason)
        state.validationError = null
      }
      return
    }

    targets.forEach((panel, index) => {
      if (latestRunIdByPanelId.get(panel.id) !== runId) return
      const outcome = settled[index]
      if (outcome?.status !== 'fulfilled') return
      state.resultsByPanelId[panel.id] = outcome.value.result
      state.edgesByGraphHash[graphKey(outcome.value.config)] = outcome.value.edges
      state.failedPanelIds.delete(panel.id)
    })

    if (!isLatestRun) return
    state.runState = 'idle'
    state.errorMessage = null
    state.validationError = null
    state.round = maxRounds()
    state.announcement = `Updated: ${resultsSummary()}`
    syncToUrl()
  }

  function setBaseField<FieldName extends keyof Config>(
    field: FieldName,
    value: Config[FieldName],
  ) {
    if (state.bounds) {
      value = clampConfigField(field, value, state.base.numStudents, state.bounds)
    }
    state.base[field] = value
    if (field === 'numStudents') clampEverythingToBounds()
    scheduleRun()
  }

  // Re-clamp the base config and every panel override; needed when
  // numStudents changes (the relational ceilings move) and when the
  // bounds first arrive while the URL may have carried wild values.
  function clampEverythingToBounds() {
    const bounds = state.bounds
    if (!bounds) return
    state.base = clampConfig(state.base, bounds)
    for (const panel of state.panels) {
      const panelStudents = panel.overrides.numStudents ?? state.base.numStudents
      for (const field of Object.keys(panel.overrides) as (keyof Config)[]) {
        const override = panel.overrides[field]
        if (override === undefined) continue
        panel.overrides[field] = clampConfigField(field, override, panelStudents, bounds)
      }
    }
  }

  function addPanel(): PanelSpec | null {
    if (state.panels.length >= MAX_PANELS) return null
    const panel: PanelSpec = {
      id: createPanelId(),
      label: `Scenario ${state.panels.length + 1}`,
      strategy: StrategyNone,
      overrides: {},
    }
    state.panels.push(panel)
    scheduleRun(panel.id)
    return panel
  }

  function duplicatePanel(panelId: string): PanelSpec | null {
    if (state.panels.length >= MAX_PANELS) return null
    const source = panelById(panelId)
    if (source === undefined) return null
    const copy: PanelSpec = {
      ...clonePanel(source),
      id: createPanelId(),
      label: `${source.label} copy`,
    }
    state.panels.push(copy)
    const sourceResult = state.resultsByPanelId[source.id]
    if (sourceResult) {
      // Identical config, identical result: seed the copy instead of
      // re-running the same scenario.
      state.resultsByPanelId[copy.id] = sourceResult
      syncToUrl()
    } else {
      scheduleRun(copy.id)
    }
    return copy
  }

  function removePanel(panelId: string) {
    if (state.panels.length <= 1) return // the last panel cannot be removed
    const index = state.panels.findIndex((panel) => panel.id === panelId)
    if (index < 0) return
    state.panels.splice(index, 1)
    delete state.resultsByPanelId[panelId]
    state.failedPanelIds.delete(panelId)
    if (state.focusPanelId === panelId) state.focusPanelId = null
    if (state.editingPanelId === panelId) state.editingPanelId = null
    syncToUrl()
  }

  function renamePanel(panelId: string, label: string) {
    const panel = panelById(panelId)
    if (panel === undefined) return
    panel.label = label
    syncToUrl()
  }

  function setPanelStrategy(panelId: string, strategy: Strategy) {
    const panel = panelById(panelId)
    if (panel === undefined || panel.strategy === strategy) return
    panel.strategy = strategy
    scheduleRun(panelId)
  }

  function setPanelOverride<FieldName extends keyof Config>(
    panelId: string,
    field: FieldName,
    value: Config[FieldName],
  ) {
    const panel = panelById(panelId)
    if (panel === undefined) return
    if (state.bounds) {
      const panelStudents =
        field === 'numStudents' ? value : (panel.overrides.numStudents ?? state.base.numStudents)
      value = clampConfigField(field, value, panelStudents, state.bounds)
    }
    if (value === state.base[field]) {
      // Typing the base value back is "no override" (spec 5.7).
      delete panel.overrides[field]
    } else {
      panel.overrides[field] = value
    }
    scheduleRun(panelId)
  }

  function clearPanelOverride(panelId: string, field: keyof Config) {
    const panel = panelById(panelId)
    if (panel === undefined || !(field in panel.overrides)) return
    delete panel.overrides[field]
    scheduleRun(panelId)
  }

  function setFocusPanel(panelId: string | null) {
    state.focusPanelId = panelId
    syncToUrl()
  }

  function syncToUrl() {
    if (typeof window === 'undefined') return
    const query = serializeUrlState(state.base, state.panels, state.focusPanelId, preset)
    window.history.replaceState(null, '', `${window.location.pathname}${query}`)
  }

  // Parse the opened URL (or fall back to the preset) and run every panel.
  // The initial run is not debounced: nothing is on screen yet. The bounds
  // arrive first so a shared link's wild values clamp instead of 400ing;
  // if that fetch fails the app still starts, with the engine's own
  // validation as the backstop.
  async function initialize(
    search: string = typeof window === 'undefined' ? '' : window.location.search,
  ): Promise<void> {
    try {
      state.bounds = (await fetchDefaultConfig()).bounds
    } catch {
      state.bounds = null
    }
    const parsed = parseUrlState(search, preset, createPanelId)
    if (parsed === null) {
      state.urlStateInvalid = true // preset defaults are already loaded
    } else {
      state.base = parsed.base
      state.panels = parsed.panels
      state.focusPanelId =
        parsed.focusIndex !== null ? (parsed.panels[parsed.focusIndex]?.id ?? null) : null
    }
    clampEverythingToBounds()
    return runPanels(null)
  }

  function retry(): Promise<void> {
    return runPanels(null)
  }

  return {
    state,
    preset,
    effectiveConfig,
    maxRounds,
    resultsSummary,
    initialize,
    retry,
    setBaseField,
    addPanel,
    duplicatePanel,
    removePanel,
    renamePanel,
    setPanelStrategy,
    setPanelOverride,
    clearPanelOverride,
    setFocusPanel,
  }
}

export type SimStore = ReturnType<typeof createSimStore>

let activeStore: SimStore | null = null

export function useSimStore(): SimStore {
  activeStore ??= createSimStore()
  return activeStore
}
