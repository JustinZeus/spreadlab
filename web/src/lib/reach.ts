// Cumulative reach at a playback round, shared by the panel stats and the
// reach chart so both always agree with the network picture.
export function reachedCountAtRound(reachedAtRound: number[], round: number): number {
  return reachedAtRound.filter((reachedAt) => reachedAt >= 0 && reachedAt <= round).length
}

// During playback, dots of the current round do not appear at once: each
// node gets a deterministic random moment inside the first APPEAR_WINDOW
// of the round interval (the rest of the interval is its fade). The same
// jitter drives the dot's animation-delay and the live counter, so the
// percentage ticks up exactly as dots start appearing.

export const APPEAR_WINDOW = 0.95

// A full-avalanche integer hash (murmur3 finalizer): consecutive node
// indices land anywhere in [0, 1), so the appearance moments of a round's
// nodes are spread evenly instead of clustering into one flash.
export function appearanceJitter(nodeIndex: number): number {
  let mixed = Math.imul(nodeIndex + 1, 0x9e3779b1)
  mixed ^= mixed >>> 16
  mixed = Math.imul(mixed, 0x85ebca6b)
  mixed ^= mixed >>> 13
  mixed = Math.imul(mixed, 0xc2b2ae35)
  mixed ^= mixed >>> 16
  return (mixed >>> 0) / 4294967296
}

// Reach as displayed mid-transition: every earlier round fully, plus the
// current round's nodes whose appearance moment has passed. With
// roundProgress = 1 this equals reachedCountAtRound.
export function reachedCountDisplayed(
  reachedAtRound: number[],
  round: number,
  roundProgress: number,
): number {
  let displayed = 0
  reachedAtRound.forEach((reachedAt, nodeIndex) => {
    if (reachedAt < 0 || reachedAt > round) return
    if (reachedAt < round || roundProgress >= appearanceJitter(nodeIndex) * APPEAR_WINDOW) {
      displayed += 1
    }
  })
  return displayed
}
