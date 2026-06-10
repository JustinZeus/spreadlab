import { describe, expect, it } from 'vitest'
import { formatPct, roundPct } from '../format'

describe('formatPct', () => {
  it('rounds 99/120 to 83%, the class of mismatch Go printf produced', () => {
    const reachedPct = (99 / 120) * 100 // 82.5; Go's %.0f said 82
    expect(formatPct(reachedPct)).toBe('83%')
    expect(roundPct(reachedPct)).toBe(83)
  })

  it('rounds down below the midpoint', () => {
    expect(formatPct((7 / 120) * 100)).toBe('6%')
  })

  it('keeps whole numbers untouched', () => {
    expect(formatPct(0)).toBe('0%')
    expect(formatPct(100)).toBe('100%')
  })
})
