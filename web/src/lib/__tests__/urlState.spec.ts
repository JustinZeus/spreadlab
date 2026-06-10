import { describe, expect, it } from 'vitest'
import { parseUrlState, serializeUrlState } from '../urlState'
import type { PanelSpec, StudyPreset } from '@/presets/types'

// A small hand-made preset so these tests do not move when the study
// preset's copy or defaults change.
const preset: StudyPreset = {
  headline: 'h',
  narrative: 'n',
  disclaimerShort: 'short',
  disclaimerLong: 'long',
  toneThresholdPct: 30,
  base: {
    numStudents: 120,
    edgesPerNode: 3,
    triangleProb: 0.45,
    forwardProb: 0.38,
    numEducated: 36,
    origin: 0,
    graphSeed: 17,
    thresholdSeed: 2,
    educationSeed: 1,
  },
  panels: [
    { id: 'preset-a', label: 'No program', strategy: 'none', overrides: {} },
    { id: 'preset-b', label: 'Educate at random', strategy: 'random', overrides: {} },
  ],
}

function idFactory(): () => string {
  let nextId = 0
  return () => `test-id-${nextId++}`
}

describe('serializeUrlState', () => {
  it('serializes the default state to an empty string', () => {
    expect(serializeUrlState(preset.base, preset.panels, null, preset)).toBe('')
  })

  it('includes only base fields that differ from the preset', () => {
    const base = { ...preset.base, forwardProb: 0.5, graphSeed: 99 }
    expect(serializeUrlState(base, preset.panels, null, preset)).toBe(
      '?forwardProb=0.5&graphSeed=99',
    )
  })

  it('emits one encoded panel param per panel once the set differs', () => {
    const panels: PanelSpec[] = [
      { id: 'a', label: 'No program', strategy: 'none', overrides: {} },
      { id: 'b', label: 'Big budget', strategy: 'random', overrides: { numEducated: 60 } },
    ]
    expect(serializeUrlState(preset.base, panels, null, preset)).toBe(
      '?panel=No%20program~none~&panel=Big%20budget~random~numEducated:60',
    )
  })

  it('serializes focus as the panel index', () => {
    expect(serializeUrlState(preset.base, preset.panels, 'preset-b', preset)).toBe('?focus=1')
  })
})

describe('parseUrlState', () => {
  it('returns the preset with fresh panel ids when the URL is empty', () => {
    const parsed = parseUrlState('', preset, idFactory())
    expect(parsed).not.toBeNull()
    expect(parsed!.base).toEqual(preset.base)
    expect(parsed!.panels.map((panel) => panel.label)).toEqual(['No program', 'Educate at random'])
    expect(parsed!.panels.map((panel) => panel.id)).toEqual(['test-id-0', 'test-id-1'])
    expect(parsed!.focusIndex).toBeNull()
  })

  it('ignores unknown params', () => {
    const parsed = parseUrlState('?utm_source=x&flag', preset, idFactory())
    expect(parsed).not.toBeNull()
    expect(parsed!.base).toEqual(preset.base)
  })

  it('round-trips a customized state', () => {
    const base = { ...preset.base, forwardProb: 0.5 }
    const panels: PanelSpec[] = [
      { id: 'a', label: 'Wave ~ one, two: go', strategy: 'most-connected', overrides: {} },
      {
        id: 'b',
        label: 'Big budget',
        strategy: 'random',
        overrides: { numEducated: 60, graphSeed: 7 },
      },
    ]
    const query = serializeUrlState(base, panels, 'b', preset)
    const parsed = parseUrlState(query, preset, idFactory())
    expect(parsed).not.toBeNull()
    expect(parsed!.base).toEqual(base)
    expect(
      parsed!.panels.map(({ label, strategy, overrides }) => ({ label, strategy, overrides })),
    ).toEqual([
      { label: 'Wave ~ one, two: go', strategy: 'most-connected', overrides: {} },
      { label: 'Big budget', strategy: 'random', overrides: { numEducated: 60, graphSeed: 7 } },
    ])
    expect(parsed!.focusIndex).toBe(1)
  })

  it.each([
    ['a non-numeric base field', '?forwardProb=fast'],
    ['an empty base field', '?forwardProb='],
    ['an unknown strategy', '?panel=X~telepathy~'],
    ['a malformed panel param', '?panel=onlylabel'],
    ['an empty panel label', '?panel=~none~'],
    ['an unknown override field', '?panel=X~none~bogus:1'],
    ['a non-numeric override value', '?panel=X~none~numEducated:lots'],
    ['an override without a value', '?panel=X~none~numEducated'],
    ['a focus index out of range', '?focus=2'],
    ['a non-integer focus', '?focus=1.5'],
    ['a negative focus', '?focus=-1'],
    [
      'more than six panels',
      `?${Array.from({ length: 7 }, (_, index) => `panel=P${index}~none~`).join('&')}`,
    ],
  ])('rejects %s so the app falls back to the preset', (_description, search) => {
    expect(parseUrlState(search, preset, idFactory())).toBeNull()
  })
})
