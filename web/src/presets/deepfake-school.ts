import { StrategyMostConnected, StrategyNone, StrategyRandom } from '@/types/engine'
import type { StudyPreset } from './types'

// The one study this deployment tells. A different research question is a
// new preset file plus a changed import in the app; no component changes.

export const deepfakeSchoolPreset: StudyPreset = {
  headline: 'How a non‑consensual deepfake spreads through a school',
  narrative:
    'One simulated year group, 120 students. Educate the same share (30%) of them, ' +
    'but change who: the fake reaches {0} of the school with no program, ' +
    '{1} educating at random, and {2} educating the best‑connected students.',
  disclaimerShort: 'Illustrative model, not validated',
  disclaimerLong:
    'spreadlab runs a seeded agent-based toy simulation: a synthetic ' +
    'friendship network of one school year group, a chance to forward the ' +
    'fake along each friendship that rises with how novel it is and falls ' +
    'with the ambient harm awareness, and an education program that strongly ' +
    'but imperfectly reduces forwarding for educated students. Its parameters ' +
    'are illustrative sensitivity ranges, not fitted to data, so it is not a ' +
    'validated prediction of any real school. Use it to build intuition about ' +
    'who to educate, not to forecast outcomes.',
  readingCaption:
    'Each dot is one student in the same simulated year group. Every scenario ' +
    'runs the identical school; only the education program differs.',
  toneThresholdPct: 30,
  base: {
    numStudents: 120,
    edgesPerNode: 3,
    triangleProb: 0.45,
    forwardProb: 0.38,
    novelty: 0.3,
    harmAwareness: 0.2,
    programEffect: 0.8,
    numEducated: 36,
    origin: 0,
    graphSeed: 17,
    thresholdSeed: 2,
    educationSeed: 1,
  },
  panels: [
    { id: 'preset-no-program', label: 'No program', strategy: StrategyNone, overrides: {} },
    {
      id: 'preset-random',
      label: 'Educate 30% at random',
      strategy: StrategyRandom,
      overrides: {},
    },
    {
      id: 'preset-most-connected',
      label: 'Educate best-connected 30%',
      strategy: StrategyMostConnected,
      overrides: {},
    },
  ],
}
