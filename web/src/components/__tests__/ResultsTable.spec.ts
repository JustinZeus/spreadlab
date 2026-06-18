import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultsTable from '../ResultsTable.vue'
import type { PanelSpec } from '@/presets/types'
import type { Config, Result } from '@/types/engine'

// Hand-made data; the real numbers come from the API and are pinned by the
// Go tests. Here we only care that the table renders them accessibly.

const base: Config = {
  numStudents: 10,
  edgesPerNode: 2,
  triangleProb: 0.4,
  forwardProb: 0.5,
  novelty: 0,
  harmAwareness: 0,
  programEffect: 1,
  numEducated: 3,
  origin: 0,
  graphSeed: 1,
  thresholdSeed: 2,
  educationSeed: 3,
}

const panels: PanelSpec[] = [
  { id: 'panel-none', label: 'No program', strategy: 'none', overrides: {} },
  { id: 'panel-random', label: 'Random picks', strategy: 'random', overrides: {} },
  {
    id: 'panel-big',
    label: 'Bigger school',
    strategy: 'most-connected',
    overrides: { numStudents: 40 },
  },
]

const resultsByPanelId: Record<string, Result> = {
  'panel-none': {
    strategy: 'none',
    educated: [],
    reachedAtRound: [0, 1, 1, 2, 2, 2, 3, -1, -1, -1],
    numReached: 7,
    numRounds: 4,
    reachedPct: 70,
  },
  'panel-random': {
    strategy: 'random',
    educated: [2, 5, 8],
    reachedAtRound: [0, 1, 1, 2, -1, -1, -1, -1, -1, -1],
    numReached: 4,
    numRounds: 3,
    reachedPct: 40,
  },
}

describe('ResultsTable', () => {
  it('renders one row per panel with its reach, honoring overrides', () => {
    const wrapper = mount(ResultsTable, { props: { panels, resultsByPanelId, base } })

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.text()).toContain('No program')
    expect(rows[0]!.text()).toContain('7 / 10')
    expect(rows[0]!.text()).toContain('70%')
    expect(rows[1]!.text()).toContain('Random')
    // The third panel has no result yet and overrides numStudents.
    expect(rows[2]!.text()).toContain('Running')
  })

  it('rounds the share with the shared formatPct', () => {
    const halfPctResults = {
      'panel-none': { ...resultsByPanelId['panel-none']!, reachedPct: 82.5 },
    }
    const wrapper = mount(ResultsTable, {
      props: { panels: panels.slice(0, 1), resultsByPanelId: halfPctResults, base },
    })
    expect(wrapper.find('tbody tr').text()).toContain('83%')
  })

  it('falls back to the raw strategy name for unknown strategies', () => {
    const oddPanels: PanelSpec[] = [
      { id: 'panel-odd', label: 'Odd', strategy: 'telepathy', overrides: {} },
    ]
    const wrapper = mount(ResultsTable, {
      props: {
        panels: oddPanels,
        resultsByPanelId: { 'panel-odd': resultsByPanelId['panel-none']! },
        base,
      },
    })
    expect(wrapper.findAll('tbody td')[0]!.text()).toBe('telepathy')
  })
})
