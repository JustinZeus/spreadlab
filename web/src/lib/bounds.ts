import type { Bounds, Config } from '@/types/engine'

// Frontend mirror of the engine's ValidateConfig, but clamping instead of
// rejecting (decided 2026-06-11): typed values snap to the nearest bound
// and out-of-range shared links keep working. The numbers themselves are
// never duplicated here; they arrive from GET /api/config/default.

const INTEGER_FIELDS: ReadonlySet<keyof Config> = new Set([
  'numStudents',
  'edgesPerNode',
  'numEducated',
  'origin',
  'graphSeed',
  'thresholdSeed',
  'educationSeed',
])

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// clampConfigField snaps one field's value into range. Relational fields
// (numEducated, origin) clamp against numStudents, which callers pass from
// whatever config the field is about to land in; seeds only need to be
// non-negative integers.
export function clampConfigField(
  field: keyof Config,
  value: number,
  numStudents: number,
  bounds: Bounds,
): number {
  const rounded = INTEGER_FIELDS.has(field) ? Math.round(value) : value
  switch (field) {
    case 'numStudents':
      return clampNumber(rounded, bounds.numStudents.min, bounds.numStudents.max)
    case 'edgesPerNode':
      return clampNumber(rounded, bounds.edgesPerNode.min, bounds.edgesPerNode.max)
    case 'triangleProb':
      return clampNumber(rounded, bounds.triangleProb.min, bounds.triangleProb.max)
    case 'forwardProb':
      return clampNumber(rounded, bounds.forwardProb.min, bounds.forwardProb.max)
    case 'numEducated':
      return clampNumber(rounded, 0, numStudents)
    case 'origin':
      return clampNumber(rounded, 0, numStudents - 1)
    default:
      return Math.max(0, rounded)
  }
}

// clampConfig snaps a whole config into range, numStudents first so the
// relational fields clamp against the corrected value.
export function clampConfig(config: Config, bounds: Bounds): Config {
  const clamped = { ...config }
  clamped.numStudents = clampConfigField('numStudents', config.numStudents, 0, bounds)
  for (const field of Object.keys(config) as (keyof Config)[]) {
    if (field === 'numStudents') continue
    clamped[field] = clampConfigField(field, config[field], clamped.numStudents, bounds)
  }
  return clamped
}
