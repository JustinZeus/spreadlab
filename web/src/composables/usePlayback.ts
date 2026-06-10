import { useSimStore, type SimStore } from './useSimStore'

// Playback (spec 5.4): one global round drives every panel, the chart
// playhead, and the focus modal. Rounds advance on a rAF timer, 700 ms per
// round at 1x (1000 ms under reduced motion, which also disables the
// one-time autoplay). Playback never loops; at the final round the play
// button becomes a replay affordance.

export const ROUND_MS = 700
export const REDUCED_MOTION_ROUND_MS = 1000

const SPEED_CYCLE: Record<number, 0.5 | 1 | 2> = { 0.5: 1, 1: 2, 2: 0.5 }

export function createPlayback(store: SimStore = useSimStore()) {
  const { state } = store
  let frameId: number | null = null
  let lastAdvanceAt = 0
  let autoplayDone = false

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function roundIntervalMs(): number {
    return (prefersReducedMotion() ? REDUCED_MOTION_ROUND_MS : ROUND_MS) / state.speed
  }

  function stopFrameLoop() {
    if (frameId !== null) cancelAnimationFrame(frameId)
    frameId = null
  }

  function finishPlayback() {
    state.playing = false
    stopFrameLoop()
    state.announcement = `Final: ${store.resultsSummary()}`
  }

  function onFrame(timestamp: number) {
    if (!state.playing) {
      frameId = null
      return
    }
    if (timestamp - lastAdvanceAt >= roundIntervalMs()) {
      lastAdvanceAt = timestamp
      state.round += 1
      if (state.round >= store.maxRounds()) {
        state.round = Math.min(state.round, store.maxRounds())
        finishPlayback()
        return
      }
    }
    frameId = requestAnimationFrame(onFrame)
  }

  function play() {
    if (store.maxRounds() === 0 || state.playing) return
    if (state.round >= store.maxRounds()) state.round = 0 // replay affordance
    state.playing = true
    lastAdvanceAt = performance.now()
    frameId = requestAnimationFrame(onFrame)
  }

  function pause() {
    if (!state.playing) return
    state.playing = false
    stopFrameLoop()
    state.announcement = `Paused at round ${state.round} of ${store.maxRounds()}`
  }

  function toggle() {
    if (state.playing) {
      pause()
    } else {
      play()
    }
  }

  // Stepping and seeking pause playback without a "paused" announcement;
  // the seek announcement happens on scrub release (announceRound).
  function quietPause() {
    state.playing = false
    stopFrameLoop()
  }

  function stepBack() {
    quietPause()
    state.round = Math.max(0, state.round - 1)
  }

  function stepForward() {
    quietPause()
    state.round = Math.min(store.maxRounds(), state.round + 1)
  }

  function seekTo(round: number) {
    quietPause()
    state.round = Math.min(store.maxRounds(), Math.max(0, Math.round(round)))
  }

  function announceRound() {
    state.announcement = `Round ${state.round} of ${store.maxRounds()}`
  }

  function replay() {
    quietPause()
    state.round = 0
    play()
  }

  function cycleSpeed() {
    state.speed = SPEED_CYCLE[state.speed] ?? 1
  }

  // Once, after the first successful load (spec 5.1): render round 0, then
  // play. Under reduced motion the page settles on the final round instead.
  function autoplayOnce() {
    if (autoplayDone) return
    autoplayDone = true
    if (store.maxRounds() === 0) return
    if (prefersReducedMotion()) {
      state.round = store.maxRounds()
      return
    }
    state.round = 0
    play()
  }

  return {
    play,
    pause,
    toggle,
    stepBack,
    stepForward,
    seekTo,
    announceRound,
    replay,
    cycleSpeed,
    autoplayOnce,
  }
}

export type Playback = ReturnType<typeof createPlayback>

let activePlayback: Playback | null = null

export function usePlayback(): Playback {
  activePlayback ??= createPlayback()
  return activePlayback
}
