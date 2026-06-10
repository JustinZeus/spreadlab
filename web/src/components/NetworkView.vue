<script setup lang="ts">
import { computed } from 'vue'
import { layoutForGraph, NETWORK_VIEW_HEIGHT, NETWORK_VIEW_WIDTH } from '@/composables/useLayout'
import { useSimStore } from '@/composables/useSimStore'
import { graphKey } from '@/lib/graph'
import type { PanelSpec } from '@/presets/types'

// One panel's network picture (spec section 6). Shape carries meaning,
// color reinforces it: forwarded discs, educated donuts, small unreached
// dots, and a halo ring on the origin. The SVG is decorative for screen
// readers; the panel text carries the result.

const props = defineProps<{ panel: PanelSpec }>()

const store = useSimStore()

const effectiveConfig = computed(() => store.effectiveConfig(props.panel))
const edges = computed(() => store.state.edgesByGraphHash[graphKey(effectiveConfig.value)] ?? [])
const result = computed(() => store.state.resultsByPanelId[props.panel.id])
const layout = computed(() => layoutForGraph(effectiveConfig.value, edges.value))

interface RenderedNode {
  x: number
  y: number
  reached: boolean
  educated: boolean
  isOrigin: boolean
}

const nodes = computed<RenderedNode[]>(() => {
  const panelResult = result.value
  if (!panelResult) return []
  const educatedNodes = new Set(panelResult.educated)
  return layout.value.map((point, nodeIndex) => {
    const reachedAtRound = panelResult.reachedAtRound[nodeIndex] ?? -1
    return {
      x: point.x,
      y: point.y,
      reached: reachedAtRound >= 0 && reachedAtRound <= store.state.round,
      educated: educatedNodes.has(nodeIndex),
      isOrigin: nodeIndex === effectiveConfig.value.origin,
    }
  })
})

function edgeEnd(edge: number[], side: 0 | 1) {
  return layout.value[edge[side] ?? 0] ?? { x: 0, y: 0 }
}
</script>

<template>
  <svg class="net" :viewBox="`0 0 ${NETWORK_VIEW_WIDTH} ${NETWORK_VIEW_HEIGHT}`" aria-hidden="true">
    <line
      v-for="(edge, edgeIndex) in edges"
      :key="edgeIndex"
      :x1="edgeEnd(edge, 0).x.toFixed(1)"
      :y1="edgeEnd(edge, 0).y.toFixed(1)"
      :x2="edgeEnd(edge, 1).x.toFixed(1)"
      :y2="edgeEnd(edge, 1).y.toFixed(1)"
      stroke="var(--edge)"
      stroke-width="1"
    />
    <g v-for="(node, nodeIndex) in nodes" :key="nodeIndex">
      <template v-if="node.isOrigin">
        <circle
          :cx="node.x"
          :cy="node.y"
          r="7.5"
          fill="none"
          stroke="var(--spread)"
          stroke-width="1.4"
          opacity="0.75"
        />
        <circle :cx="node.x" :cy="node.y" r="4" fill="var(--spread)" />
      </template>
      <circle
        v-else-if="node.educated"
        :cx="node.x"
        :cy="node.y"
        r="3.8"
        :fill="node.reached ? 'var(--spread)' : 'var(--surface)'"
        stroke="var(--edu)"
        stroke-width="2.2"
      />
      <circle v-else-if="node.reached" :cx="node.x" :cy="node.y" r="4" fill="var(--spread)" />
      <circle v-else :cx="node.x" :cy="node.y" r="3" fill="var(--unreached)" />
    </g>
  </svg>
</template>

<style scoped>
.net {
  width: 100%;
  height: auto;
  display: block;
  margin-top: 4px;
}
</style>
