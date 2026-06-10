<script setup lang="ts">
import { computed } from 'vue'
import { layoutForGraph, NETWORK_VIEW_HEIGHT, NETWORK_VIEW_WIDTH } from '@/composables/useLayout'
import { ROUND_MS } from '@/composables/usePlayback'
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
  justReached: boolean // reached exactly this round: animates in (spec 5.4)
  educated: boolean
  isOrigin: boolean
}

const nodes = computed<RenderedNode[]>(() => {
  const panelResult = result.value
  if (!panelResult) return []
  const educatedNodes = new Set(panelResult.educated)
  return layout.value.map((point, nodeIndex) => {
    const reachedAtRound = panelResult.reachedAtRound[nodeIndex] ?? -1
    const reached = reachedAtRound >= 0 && reachedAtRound <= store.state.round
    return {
      x: point.x,
      y: point.y,
      reached,
      justReached: reached && reachedAtRound === store.state.round && store.state.round > 0,
      educated: educatedNodes.has(nodeIndex),
      isOrigin: nodeIndex === effectiveConfig.value.origin,
    }
  })
})

function edgeEnd(edge: number[], side: 0 | 1) {
  return layout.value[edge[side] ?? 0] ?? { x: 0, y: 0 }
}

// The fade-in spans the whole round interval (scaled with playback speed)
// and each node starts at a small deterministic offset, so during playback
// something is always in motion; there is never a finished still frame
// between rounds.
const popDurationMs = computed(() => ROUND_MS / store.state.speed)

function popDelay(nodeIndex: number): string {
  return `${((nodeIndex * 37) % 150) / store.state.speed}ms`
}
</script>

<template>
  <svg
    class="net"
    :viewBox="`0 0 ${NETWORK_VIEW_WIDTH} ${NETWORK_VIEW_HEIGHT}`"
    :style="{ '--pop-ms': `${popDurationMs}ms` }"
    aria-hidden="true"
  >
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
        :class="{ pop: node.justReached }"
        :style="node.justReached ? { animationDelay: popDelay(nodeIndex) } : undefined"
        :cx="node.x"
        :cy="node.y"
        r="3.8"
        :fill="node.reached ? 'var(--spread)' : 'var(--surface)'"
        stroke="var(--edu)"
        stroke-width="2.2"
      />
      <circle
        v-else-if="node.reached"
        :class="{ pop: node.justReached }"
        :style="node.justReached ? { animationDelay: popDelay(nodeIndex) } : undefined"
        :cx="node.x"
        :cy="node.y"
        r="4"
        fill="var(--spread)"
      />
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

/* Nodes reached this round fade and scale in across the full round
   interval (driven by --pop-ms), so playback reads as continuous motion.
   The global reduced-motion rule collapses this to a discrete swap. */
.pop {
  animation: pop var(--pop-ms, 650ms) ease-out backwards;
  transform-box: fill-box;
  transform-origin: center;
}

@keyframes pop {
  from {
    transform: scale(0.5);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
