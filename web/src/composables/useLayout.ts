import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force'
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force'
import { graphKey } from '@/lib/graph'
import { mulberry32 } from '@/lib/mulberry32'
import type { Config } from '@/types/engine'

// Seeded force layout (spec section 6): d3-force run synchronously for a
// fixed number of ticks with a mulberry32 random source and seeded initial
// positions, so identical configs give identical pictures on every machine
// (the shared-URL guarantee). Layouts are cached per graph hash; panels
// that share the base graph share one layout and their differences read as
// the experiment, not as noise.

export interface LayoutPoint {
  x: number
  y: number
}

export const NETWORK_VIEW_WIDTH = 380
export const NETWORK_VIEW_HEIGHT = 230
const LAYOUT_PADDING = 14
const LAYOUT_TICKS = 300

interface LayoutNode extends SimulationNodeDatum {
  index: number
}

const layoutCache = new Map<string, LayoutPoint[]>()

export function clearLayoutCache() {
  layoutCache.clear()
}

export function layoutForGraph(config: Config, edges: number[][]): LayoutPoint[] {
  const cacheKey = graphKey(config)
  const cached = layoutCache.get(cacheKey)
  if (cached) return cached

  const random = mulberry32(Number(config.graphSeed) >>> 0)
  const nodes: LayoutNode[] = Array.from({ length: config.numStudents }, (_, index) => {
    // Seeded start positions in a wide disc; the forces do the rest.
    const angle = random() * Math.PI * 2
    const radius = Math.sqrt(random())
    return { index, x: Math.cos(angle) * radius * 150, y: Math.sin(angle) * radius * 60 }
  })
  const links: SimulationLinkDatum<LayoutNode>[] = edges.map((edge) => ({
    source: edge[0] ?? 0,
    target: edge[1] ?? 0,
  }))

  // The vertical pull is stronger than the horizontal one, so the cloud
  // settles into the panel's wide ellipse by itself; fitting then scales
  // both axes uniformly, which keeps the spacing organic (anisotropic
  // stretching reads as line patterns).
  forceSimulation(nodes)
    .randomSource(random)
    .force(
      'link',
      forceLink<LayoutNode, SimulationLinkDatum<LayoutNode>>(links).distance(16).strength(0.3),
    )
    .force('charge', forceManyBody().strength(-15))
    .force('x', forceX(0).strength(0.028))
    .force('y', forceY(0).strength(0.22))
    .force('collide', forceCollide(5.5))
    .stop()
    .tick(LAYOUT_TICKS)

  const xs = nodes.map((node) => node.x ?? 0)
  const ys = nodes.map((node) => node.y ?? 0)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const scale = Math.min(
    (NETWORK_VIEW_WIDTH - 2 * LAYOUT_PADDING) / Math.max(maxX - minX, 1),
    (NETWORK_VIEW_HEIGHT - 2 * LAYOUT_PADDING) / Math.max(maxY - minY, 1),
  )
  const offsetX = (NETWORK_VIEW_WIDTH - (maxX - minX) * scale) / 2
  const offsetY = (NETWORK_VIEW_HEIGHT - (maxY - minY) * scale) / 2

  const points = nodes.map((node) => ({
    x: offsetX + ((node.x ?? 0) - minX) * scale,
    y: offsetY + ((node.y ?? 0) - minY) * scale,
  }))
  layoutCache.set(cacheKey, points)
  return points
}
