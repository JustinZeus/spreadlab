import type { Config, Strategy } from '@/types/engine'

// One human name per Config field, shared by the controls card and the
// panel editor so the same lever never appears under two names.
export const CONFIG_FIELD_LABELS: Record<keyof Config, string> = {
  numStudents: 'Students',
  edgesPerNode: 'Friends per student',
  triangleProb: 'Clique tendency',
  forwardProb: 'Chance to forward',
  numEducated: 'Education budget',
  origin: 'First poster',
  graphSeed: 'Friendship network',
  thresholdSeed: 'Who resists',
  educationSeed: 'Random picks',
}

export const STRATEGY_LABELS: Record<Strategy, string> = {
  none: 'None',
  random: 'Random',
  'most-connected': 'Most connected',
}
