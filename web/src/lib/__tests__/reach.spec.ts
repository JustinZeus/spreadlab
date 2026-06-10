import { describe, expect, it } from 'vitest'
import { reachedCountAtRound, reachedCountDisplayed } from '../reach'

// Ten students: origin at round 0, then two per round for rounds 1-3,
// three never reached.
const reachedAtRound = [0, 1, 1, 2, 2, 3, 3, -1, -1, -1]

describe('reachedCountAtRound', () => {
  it('counts cumulatively and ignores never-reached nodes', () => {
    expect(reachedCountAtRound(reachedAtRound, 0)).toBe(1)
    expect(reachedCountAtRound(reachedAtRound, 2)).toBe(5)
    expect(reachedCountAtRound(reachedAtRound, 99)).toBe(7)
  })
})

describe('reachedCountDisplayed', () => {
  it('equals the per-round count when the transition has finished', () => {
    for (let round = 0; round <= 3; round++) {
      expect(reachedCountDisplayed(reachedAtRound, round, 1)).toBe(
        reachedCountAtRound(reachedAtRound, round),
      )
    }
  })

  it('grows monotonically through the transition, bounded by adjacent rounds', () => {
    const round = 2
    const fullPreviousRound = reachedCountAtRound(reachedAtRound, round - 1)
    const fullCurrentRound = reachedCountAtRound(reachedAtRound, round)
    let previousCount = 0
    for (let step = 0; step <= 10; step++) {
      const count = reachedCountDisplayed(reachedAtRound, round, step / 10)
      expect(count).toBeGreaterThanOrEqual(fullPreviousRound)
      expect(count).toBeLessThanOrEqual(fullCurrentRound)
      expect(count).toBeGreaterThanOrEqual(previousCount)
      previousCount = count
    }
    expect(previousCount).toBe(fullCurrentRound)
  })
})
