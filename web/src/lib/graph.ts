import type { Config } from '@/types/engine'

// Panels that agree on these four fields get the same topology from the
// engine, so the frontend caches edges (and later, layouts) per key.
export function graphKey(config: Config): string {
  return `${config.numStudents}|${config.edgesPerNode}|${config.triangleProb}|${config.graphSeed}`
}
