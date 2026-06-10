// Cumulative reach at a playback round, shared by the panel stats and the
// reach chart so both always agree with the network picture.
export function reachedCountAtRound(reachedAtRound: number[], round: number): number {
  return reachedAtRound.filter((reachedAt) => reachedAt >= 0 && reachedAt <= round).length
}
