import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPlayback, REDUCED_MOTION_ROUND_MS, ROUND_MS } from '../usePlayback'
import { createSimStore } from '../useSimStore'
import { runScenario } from '@/lib/api'
import type { ScenarioRequest, ScenarioResponse } from '@/types/api'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return { ...actual, runScenario: vi.fn<typeof actual.runScenario>() }
})

const runScenarioMock = vi.mocked(runScenario)

// Every panel runs 5 rounds in this fake engine.
const FINAL_ROUND = 5

function fakeResponse(request: ScenarioRequest): ScenarioResponse {
  const { numStudents } = request.config
  return {
    config: request.config,
    result: {
      strategy: request.strategy,
      educated: [],
      reachedAtRound: Array.from({ length: numStudents }, (_, node) =>
        node < FINAL_ROUND ? node : -1,
      ),
      numReached: FINAL_ROUND,
      numRounds: FINAL_ROUND,
      reachedPct: (FINAL_ROUND / numStudents) * 100,
    },
    edges: [[0, 1]],
  }
}

let prefersReducedMotion = false

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  })
  runScenarioMock.mockReset()
  runScenarioMock.mockImplementation(async (request) => fakeResponse(request))
  prefersReducedMotion = false
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: prefersReducedMotion && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function readyStore() {
  const store = createSimStore()
  await store.initialize('')
  return store
}

describe('usePlayback', () => {
  it('autoplays once from round 0 and advances on the 700 ms cadence', async () => {
    const store = await readyStore()
    const playback = createPlayback(store)

    playback.autoplayOnce()
    expect(store.state.round).toBe(0)
    expect(store.state.playing).toBe(true)

    await vi.advanceTimersByTimeAsync(ROUND_MS + 20)
    expect(store.state.round).toBe(1)
    await vi.advanceTimersByTimeAsync(ROUND_MS)
    expect(store.state.round).toBe(2)
  })

  it('stops on the final round, announces, and replays via play', async () => {
    const store = await readyStore()
    const playback = createPlayback(store)

    playback.autoplayOnce()
    await vi.advanceTimersByTimeAsync(ROUND_MS * (FINAL_ROUND + 3))

    expect(store.state.round).toBe(FINAL_ROUND)
    expect(store.state.playing).toBe(false) // no loop
    expect(store.state.announcement).toContain('Final:')

    playback.play() // at the end, play is the replay affordance
    expect(store.state.round).toBe(0)
    expect(store.state.playing).toBe(true)
  })

  it('autoplays only once', async () => {
    const store = await readyStore()
    const playback = createPlayback(store)

    playback.autoplayOnce()
    await vi.advanceTimersByTimeAsync(ROUND_MS * (FINAL_ROUND + 3))
    playback.autoplayOnce()
    expect(store.state.playing).toBe(false)
  })

  it('doubles the cadence at 2x speed', async () => {
    const store = await readyStore()
    const playback = createPlayback(store)

    playback.cycleSpeed() // 1x -> 2x
    expect(store.state.speed).toBe(2)
    playback.play()
    await vi.advanceTimersByTimeAsync(ROUND_MS / 2 + 20)
    expect(store.state.round).toBe(1)
  })

  it('steps and seeks pause playback and clamp to the round range', async () => {
    const store = await readyStore()
    const playback = createPlayback(store)

    playback.play()
    playback.stepForward()
    expect(store.state.playing).toBe(false)
    expect(store.state.round).toBe(1)

    playback.seekTo(99)
    expect(store.state.round).toBe(FINAL_ROUND)
    playback.stepForward()
    expect(store.state.round).toBe(FINAL_ROUND)

    playback.seekTo(-3)
    expect(store.state.round).toBe(0)
    playback.stepBack()
    expect(store.state.round).toBe(0)

    playback.announceRound()
    expect(store.state.announcement).toBe(`Round 0 of ${FINAL_ROUND}`)
  })

  it('pausing announces the current round', async () => {
    const store = await readyStore()
    const playback = createPlayback(store)

    playback.play()
    await vi.advanceTimersByTimeAsync(ROUND_MS + 20)
    playback.pause()
    expect(store.state.announcement).toBe(`Paused at round 1 of ${FINAL_ROUND}`)
  })

  it('under reduced motion: no autoplay, page settles on the final round, slower cadence', async () => {
    prefersReducedMotion = true
    const store = await readyStore()
    const playback = createPlayback(store)

    playback.autoplayOnce()
    expect(store.state.playing).toBe(false)
    expect(store.state.round).toBe(FINAL_ROUND)

    playback.replay()
    expect(store.state.playing).toBe(true)
    await vi.advanceTimersByTimeAsync(ROUND_MS + 20)
    expect(store.state.round).toBe(0) // 700 ms is not enough at reduced motion
    await vi.advanceTimersByTimeAsync(REDUCED_MOTION_ROUND_MS - ROUND_MS + 20)
    expect(store.state.round).toBe(1)
  })
})
