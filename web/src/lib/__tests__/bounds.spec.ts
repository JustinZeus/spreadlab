import { describe, expect, it } from 'vitest'
import { clampConfig, clampConfigField } from '../bounds'
import type { Bounds, Config } from '@/types/engine'

// Bounds values here are test stand-ins; the real ones come from the API.
const bounds: Bounds = {
  numStudents: { min: 10, max: 500 },
  edgesPerNode: { min: 1, max: 8 },
  triangleProb: { min: 0, max: 1 },
  forwardProb: { min: 0, max: 0.9 },
  novelty: { min: 0, max: 1 },
  harmAwareness: { min: 0, max: 1 },
  programEffect: { min: 0, max: 1 },
}

const config: Config = {
  numStudents: 120,
  edgesPerNode: 3,
  triangleProb: 0.45,
  forwardProb: 0.38,
  novelty: 0,
  harmAwareness: 0,
  programEffect: 1,
  numEducated: 36,
  origin: 0,
  graphSeed: 17,
  thresholdSeed: 2,
  educationSeed: 1,
}

describe('clampConfigField', () => {
  it('snaps absolute fields to their bounds', () => {
    expect(clampConfigField('edgesPerNode', 150, 120, bounds)).toBe(8)
    expect(clampConfigField('edgesPerNode', 0, 120, bounds)).toBe(1)
    expect(clampConfigField('forwardProb', 1, 120, bounds)).toBe(0.9)
    expect(clampConfigField('numStudents', 5000, 120, bounds)).toBe(500)
    expect(clampConfigField('numStudents', 2, 120, bounds)).toBe(10)
  })

  it('clamps relational fields against numStudents', () => {
    expect(clampConfigField('numEducated', 200, 120, bounds)).toBe(120)
    expect(clampConfigField('origin', 120, 120, bounds)).toBe(119)
    expect(clampConfigField('origin', -3, 120, bounds)).toBe(0)
  })

  it('rounds integer fields and keeps seeds non-negative', () => {
    expect(clampConfigField('numStudents', 99.7, 120, bounds)).toBe(100)
    expect(clampConfigField('graphSeed', -5, 120, bounds)).toBe(0)
    expect(clampConfigField('triangleProb', 0.45, 120, bounds)).toBe(0.45)
  })

  it('leaves in-range values untouched', () => {
    expect(clampConfigField('forwardProb', 0.38, 120, bounds)).toBe(0.38)
    expect(clampConfigField('numEducated', 36, 120, bounds)).toBe(36)
  })
})

describe('clampConfig', () => {
  it('returns an equal config when everything is in range', () => {
    expect(clampConfig(config, bounds)).toEqual(config)
  })

  it('clamps numStudents first so relational fields follow the corrected value', () => {
    const wild = { ...config, numStudents: 5000, numEducated: 1000, origin: 999 }
    const clamped = clampConfig(wild, bounds)
    expect(clamped.numStudents).toBe(500)
    expect(clamped.numEducated).toBe(500)
    expect(clamped.origin).toBe(499)
  })

  it('does not mutate its input', () => {
    const wild = { ...config, forwardProb: 2 }
    clampConfig(wild, bounds)
    expect(wild.forwardProb).toBe(2)
  })
})
