import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ComparisonTable from '../ComparisonTable.vue'
import type { ComparisonResponse } from '@/types/api'

// A small hand-made comparison; the real numbers come from the API and are
// pinned by the Go tests. Here we only care that the table renders them.
const comparison: ComparisonResponse = {
  config: {
    numStudents: 10,
    edgesPerNode: 2,
    triangleProb: 0.4,
    forwardProb: 0.5,
    numEducated: 3,
    origin: 0,
    graphSeed: 1,
    thresholdSeed: 2,
    educationSeed: 3,
  },
  results: [
    {
      strategy: 'none',
      educated: [],
      reachedAtRound: [0, 1, 1, 2, 2, 2, 3, -1, -1, -1],
      numReached: 7,
      numRounds: 4,
      reachedPct: 70,
    },
    {
      strategy: 'random',
      educated: [2, 5, 8],
      reachedAtRound: [0, 1, 1, 2, -1, -1, -1, -1, -1, -1],
      numReached: 4,
      numRounds: 3,
      reachedPct: 40,
    },
    {
      strategy: 'most-connected',
      educated: [1, 2, 3],
      reachedAtRound: [0, 1, -1, -1, -1, -1, -1, -1, -1, -1],
      numReached: 2,
      numRounds: 2,
      reachedPct: 20,
    },
  ],
}

describe('ComparisonTable', () => {
  it('renders one row per strategy with its reach', () => {
    const wrapper = mount(ComparisonTable, { props: { comparison } })

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.text()).toContain('No program')
    expect(rows[0]!.text()).toContain('7 / 10')
    expect(rows[2]!.text()).toContain('Educate the most connected')
    expect(rows[2]!.text()).toContain('20%')
  })

  it('falls back to the raw strategy name for unknown strategies', () => {
    const unknown: ComparisonResponse = {
      config: comparison.config,
      results: [{ ...comparison.results[0]!, strategy: 'telepathy' }],
    }
    const wrapper = mount(ComparisonTable, { props: { comparison: unknown } })
    expect(wrapper.find('tbody th').text()).toBe('telepathy')
  })
})
