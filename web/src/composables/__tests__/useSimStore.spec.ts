import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSimStore, RUN_DEBOUNCE_MS } from '../useSimStore'
import { ApiError, fetchDefaultConfig, runScenario } from '@/lib/api'
import type { ScenarioRequest, ScenarioResponse } from '@/types/api'
import type { Bounds } from '@/types/engine'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    runScenario: vi.fn<typeof actual.runScenario>(),
    fetchDefaultConfig: vi.fn<typeof actual.fetchDefaultConfig>(),
  }
})

const runScenarioMock = vi.mocked(runScenario)
const fetchDefaultConfigMock = vi.mocked(fetchDefaultConfig)

// Stand-in bounds matching the engine's real ones closely enough for the
// clamping tests; the store treats them as opaque numbers either way.
const TEST_BOUNDS: Bounds = {
  numStudents: { min: 10, max: 500 },
  edgesPerNode: { min: 1, max: 8 },
  triangleProb: { min: 0, max: 1 },
  forwardProb: { min: 0, max: 0.9 },
}

// The fake engine: numReached mirrors numEducated so tests can tell which
// config produced a result, and the no-program panel runs the longest.
function fakeResponse(request: ScenarioRequest): ScenarioResponse {
  const { numStudents, numEducated } = request.config
  return {
    config: request.config,
    result: {
      strategy: request.strategy,
      educated: [],
      reachedAtRound: Array.from({ length: numStudents }, (_, node) => (node < 3 ? node : -1)),
      numReached: numEducated,
      numRounds: request.strategy === 'none' ? 9 : 3,
      reachedPct: (numEducated / numStudents) * 100,
    },
    edges: [
      [0, 1],
      [1, 2],
    ],
  }
}

// Settles promise chains (Promise.allSettled and friends) without real time.
async function flushAsync() {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}

beforeEach(() => {
  vi.useFakeTimers()
  runScenarioMock.mockReset()
  runScenarioMock.mockImplementation(async (request) => fakeResponse(request))
  fetchDefaultConfigMock.mockReset()
  fetchDefaultConfigMock.mockImplementation(async () => {
    const { deepfakeSchoolPreset } = await import('@/presets/deepfake-school')
    return { config: deepfakeSchoolPreset.base, bounds: TEST_BOUNDS }
  })
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useSimStore initialization', () => {
  it('runs every preset panel in parallel and swaps results in', async () => {
    const store = createSimStore()
    await store.initialize('')

    expect(runScenarioMock).toHaveBeenCalledTimes(3)
    expect(store.state.panels).toHaveLength(3)
    for (const panel of store.state.panels) {
      expect(store.state.resultsByPanelId[panel.id]).toBeDefined()
    }
    expect(store.state.runState).toBe('idle')
    expect(store.state.round).toBe(9) // the global max across panels
    // All preset panels share the base graph: one cached edge list.
    expect(Object.keys(store.state.edgesByGraphHash)).toHaveLength(1)
  })

  it('applies state from the opened URL', async () => {
    const store = createSimStore()
    await store.initialize('?forwardProb=0.5&panel=Custom~random~numEducated:60')

    expect(store.state.base.forwardProb).toBe(0.5)
    expect(store.state.panels).toHaveLength(1)
    expect(store.state.panels[0]!.label).toBe('Custom')
    expect(store.state.panels[0]!.overrides).toEqual({ numEducated: 60 })
    const request = runScenarioMock.mock.calls[0]![0]
    expect(request.config.forwardProb).toBe(0.5)
    expect(request.config.numEducated).toBe(60)
    expect(request.strategy).toBe('random')
  })

  it('falls back to the preset on a malformed URL and flags it', async () => {
    const store = createSimStore()
    await store.initialize('?panel=Bad~telepathy~')

    expect(store.state.urlStateInvalid).toBe(true)
    expect(store.state.panels).toHaveLength(3)
    expect(store.state.runState).toBe('idle')
  })
})

describe('useSimStore runs', () => {
  it('debounces base changes and reruns every panel with the final value', async () => {
    const store = createSimStore()
    await store.initialize('')
    runScenarioMock.mockClear()

    store.setBaseField('forwardProb', 0.5)
    store.setBaseField('forwardProb', 0.6)
    expect(runScenarioMock).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(RUN_DEBOUNCE_MS)
    await flushAsync()

    expect(runScenarioMock).toHaveBeenCalledTimes(3)
    for (const call of runScenarioMock.mock.calls) {
      expect(call[0].config.forwardProb).toBe(0.6)
    }
    expect(store.state.runState).toBe('idle')
    expect(window.location.search).toBe('?forwardProb=0.6')
  })

  it('reruns only the edited panel', async () => {
    const store = createSimStore()
    await store.initialize('')
    runScenarioMock.mockClear()
    const secondPanel = store.state.panels[1]!

    store.setPanelOverride(secondPanel.id, 'numEducated', 60)
    await vi.advanceTimersByTimeAsync(RUN_DEBOUNCE_MS)
    await flushAsync()

    expect(runScenarioMock).toHaveBeenCalledTimes(1)
    expect(runScenarioMock.mock.calls[0]![0].config.numEducated).toBe(60)
    expect(store.state.resultsByPanelId[secondPanel.id]!.numReached).toBe(60)
  })

  it('widens a pending single-panel rerun when a base change follows', async () => {
    const store = createSimStore()
    await store.initialize('')
    runScenarioMock.mockClear()

    store.setPanelOverride(store.state.panels[1]!.id, 'numEducated', 60)
    store.setBaseField('forwardProb', 0.6)
    await vi.advanceTimersByTimeAsync(RUN_DEBOUNCE_MS)
    await flushAsync()

    expect(runScenarioMock).toHaveBeenCalledTimes(3)
  })

  it('keeps the last good results on a network failure and recovers on retry', async () => {
    const store = createSimStore()
    await store.initialize('')
    const goodResults = { ...store.state.resultsByPanelId }
    runScenarioMock.mockImplementation(async () => {
      throw new TypeError('fetch failed')
    })

    store.setBaseField('forwardProb', 0.6)
    await vi.advanceTimersByTimeAsync(RUN_DEBOUNCE_MS)
    await flushAsync()

    expect(store.state.runState).toBe('error')
    expect(store.state.errorMessage).toBe('fetch failed')
    expect(store.state.validationError).toBeNull()
    expect(store.state.resultsByPanelId).toEqual(goodResults)
    // Every panel in the failed run gets the rose kebab dot.
    expect(store.state.failedPanelIds.size).toBe(3)

    runScenarioMock.mockImplementation(async (request) => fakeResponse(request))
    await store.retry()
    expect(store.state.runState).toBe('idle')
    expect(store.state.errorMessage).toBeNull()
    expect(store.state.failedPanelIds.size).toBe(0)
  })

  it('routes a 400 to validationError instead of the banner', async () => {
    const store = createSimStore()
    await store.initialize('')
    runScenarioMock.mockImplementation(async () => {
      throw new ApiError(400, 'forwardProb must be between 0 and 1')
    })

    store.setBaseField('forwardProb', 7)
    await vi.advanceTimersByTimeAsync(RUN_DEBOUNCE_MS)
    await flushAsync()

    expect(store.state.validationError).toBe('forwardProb must be between 0 and 1')
    expect(store.state.errorMessage).toBeNull()
    expect(store.state.runState).toBe('error')
  })

  it('drops a stale response when a newer run supersedes it', async () => {
    const store = createSimStore()
    await store.initialize('')
    runScenarioMock.mockClear()
    const secondPanel = store.state.panels[1]!

    let resolveSlowRun!: (response: ScenarioResponse) => void
    let slowRequest!: ScenarioRequest
    runScenarioMock.mockImplementationOnce((request) => {
      slowRequest = request
      return new Promise((resolve) => {
        resolveSlowRun = resolve
      })
    })

    store.setPanelOverride(secondPanel.id, 'numEducated', 60)
    await vi.advanceTimersByTimeAsync(RUN_DEBOUNCE_MS) // slow run in flight

    store.setPanelOverride(secondPanel.id, 'numEducated', 70)
    await vi.advanceTimersByTimeAsync(RUN_DEBOUNCE_MS)
    await flushAsync()
    expect(store.state.resultsByPanelId[secondPanel.id]!.numReached).toBe(70)

    resolveSlowRun(fakeResponse(slowRequest)) // lands late, must be ignored
    await flushAsync()
    expect(store.state.resultsByPanelId[secondPanel.id]!.numReached).toBe(70)
  })
})

describe('useSimStore panel management', () => {
  it('adds panels up to the cap of six and runs each new one', async () => {
    const store = createSimStore()
    await store.initialize('')
    runScenarioMock.mockClear()

    const added = store.addPanel()
    expect(added).not.toBeNull()
    expect(added!.label).toBe('Scenario 4')
    await vi.advanceTimersByTimeAsync(RUN_DEBOUNCE_MS)
    await flushAsync()
    expect(runScenarioMock).toHaveBeenCalledTimes(1)
    expect(store.state.resultsByPanelId[added!.id]).toBeDefined()

    expect(store.addPanel()).not.toBeNull()
    expect(store.addPanel()).not.toBeNull()
    expect(store.state.panels).toHaveLength(6)
    expect(store.addPanel()).toBeNull()
  })

  it('seeds a duplicate from the source result without a rerun', async () => {
    const store = createSimStore()
    await store.initialize('')
    runScenarioMock.mockClear()
    const sourcePanel = store.state.panels[0]!

    const copy = store.duplicatePanel(sourcePanel.id)
    expect(copy).not.toBeNull()
    expect(copy!.label).toBe('No program copy')
    expect(store.state.resultsByPanelId[copy!.id]).toBe(
      store.state.resultsByPanelId[sourcePanel.id],
    )

    await vi.advanceTimersByTimeAsync(RUN_DEBOUNCE_MS)
    expect(runScenarioMock).not.toHaveBeenCalled()
  })

  it('removes a panel with its result but never the last one', async () => {
    const store = createSimStore()
    await store.initialize('')
    const [first, second, third] = store.state.panels

    store.removePanel(first!.id)
    store.removePanel(second!.id)
    expect(store.state.panels).toHaveLength(1)
    expect(store.state.resultsByPanelId[first!.id]).toBeUndefined()

    store.removePanel(third!.id)
    expect(store.state.panels).toHaveLength(1) // the last panel stays
  })

  it('reflects focus in the URL and clears it when the panel goes away', async () => {
    const store = createSimStore()
    await store.initialize('')
    const secondPanel = store.state.panels[1]!

    store.setFocusPanel(secondPanel.id)
    expect(window.location.search).toBe('?focus=1')

    store.removePanel(secondPanel.id)
    expect(store.state.focusPanelId).toBeNull()
    expect(window.location.search).not.toContain('focus=')
  })
})

describe('bounds clamping', () => {
  it('stores the served bounds on initialize', async () => {
    const store = createSimStore()
    await store.initialize('')
    expect(store.state.bounds).toEqual(TEST_BOUNDS)
  })

  it('clamps wild shared-link values instead of running them', async () => {
    const store = createSimStore()
    await store.initialize('?numStudents=5000&edgesPerNode=150&forwardProb=1&panel=Wild~random~numEducated:9999')

    expect(store.state.base.numStudents).toBe(500)
    expect(store.state.base.edgesPerNode).toBe(8)
    expect(store.state.base.forwardProb).toBe(0.9)
    expect(store.state.panels[0]!.overrides.numEducated).toBe(500)
  })

  it('clamps typed base values to the bounds', async () => {
    const store = createSimStore()
    await store.initialize('')

    store.setBaseField('forwardProb', 1)
    expect(store.state.base.forwardProb).toBe(0.9)
    store.setBaseField('edgesPerNode', 150)
    expect(store.state.base.edgesPerNode).toBe(8)
  })

  it('pulls relational fields down when numStudents shrinks', async () => {
    const store = createSimStore()
    await store.initialize('')
    store.setBaseField('origin', 100)
    store.setBaseField('numEducated', 110)

    store.setBaseField('numStudents', 50)
    expect(store.state.base.origin).toBe(49)
    expect(store.state.base.numEducated).toBe(50)
  })

  it('starts without clamping when the bounds fetch fails', async () => {
    fetchDefaultConfigMock.mockRejectedValue(new Error('offline'))
    const store = createSimStore()
    await store.initialize('')

    expect(store.state.bounds).toBeNull()
    store.setBaseField('forwardProb', 1)
    expect(store.state.base.forwardProb).toBe(1) // the engine 400 backstops
  })
})
