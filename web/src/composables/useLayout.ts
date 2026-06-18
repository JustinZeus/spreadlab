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

export const NETWORK_VIEW_WIDTH = 340
export const NETWORK_VIEW_HEIGHT = 270
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
    // Seeded start positions in a balanced disc; the forces do the rest.
    const angle = random() * Math.PI * 2
    const radius = Math.sqrt(random())
    return { index, x: Math.cos(angle) * radius * 120, y: Math.sin(angle) * radius * 90 }
  })
  const links: SimulationLinkDatum<LayoutNode>[] = edges.map((edge) => ({
    source: edge[0] ?? 0,
    target: edge[1] ?? 0,
  }))

  // A gentle horizontal pull with a stronger vertical one settles the cloud
  // into a slightly wide blob (a softer version of the original ellipse) while
  // staying organic: its hubs and clusters show, not a uniform disc. The
  // charge, link and collision forces do the structural work; fitting then
  // scales both axes uniformly, so the spacing stays organic (anisotropic
  // stretching would read as line patterns).
  forceSimulation(nodes)
    .randomSource(random)
    .force(
      'link',
      forceLink<LayoutNode, SimulationLinkDatum<LayoutNode>>(links).distance(16).strength(0.3),
    )
    .force('charge', forceManyBody().strength(-16))
    .force('x', forceX(0).strength(0.04))
    .force('y', forceY(0).strength(0.085))
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
  // Only cache once the real edges are in. A reroll changes the config (and
  // this cache key) immediately, before the new edges arrive from the API;
  // computing then would cache a link-less, uniform-circle layout under this
  // key and never recompute it. Without edges, recompute next time instead.
  if (edges.length > 0) layoutCache.set(cacheKey, points)
  return points
}
