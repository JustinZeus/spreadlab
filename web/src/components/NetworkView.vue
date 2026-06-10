<script setup lang="ts">
import { computed } from 'vue'
import { layoutForGraph, NETWORK_VIEW_HEIGHT, NETWORK_VIEW_WIDTH } from '@/composables/useLayout'
import { useNodeHover } from '@/composables/useNodeHover'
import { ROUND_MS } from '@/composables/usePlayback'
import { useSimStore } from '@/composables/useSimStore'
import { graphKey } from '@/lib/graph'
import { nodeDisplayedAsReached } from '@/lib/reach'
import type { PanelSpec } from '@/presets/types'

// One panel's network picture (spec section 6). Shape carries meaning,
// color reinforces it: forwarded discs, educated donuts, small unreached
// dots, and a halo ring on the origin. The SVG is decorative for screen
// readers; the panel text carries the result.

const props = defineProps<{ panel: PanelSpec }>()

const store = useSimStore()
const { setHoveredNode, moveHoveredNode, clearHoveredNode } = useNodeHover()

const effectiveConfig = computed(() => store.effectiveConfig(props.panel))
const panelGraphKey = computed(() => graphKey(effectiveConfig.value))
const edges = computed(() => store.state.edgesByGraphHash[panelGraphKey.value] ?? [])
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
    // A node stays an unreached dot until its own appearance moment inside
    // the round transition; the swap to rose is when its fade-in starts.
    const reached = nodeDisplayedAsReached(
      reachedAtRound,
      nodeIndex,
      store.state.round,
      store.state.roundProgress,
    )
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

// The cross-panel echo (spec 5.5): the hovered student gets an ink ring
// in every panel simultaneously, regardless of which panel is pointed at.
const echoPoint = computed(() =>
  store.state.hoveredNode !== null ? layout.value[store.state.hoveredNode] : undefined,
)

// A tap shows the tooltip without opening the focus modal; a mouse click
// falls through to the surrounding zoom button (spec 5.5 vs 5.8).
function onNodeClick(nodeIndex: number, event: MouseEvent) {
  if (event instanceof PointerEvent && event.pointerType === 'touch') {
    event.stopPropagation()
    setHoveredNode(props.panel.id, nodeIndex, event)
  }
}

// Each dot's fade starts exactly when the shared appearance predicate
// flips it to reached (per-frame roundProgress gating), so no delay is
// needed here; the fade itself takes a slice of the round interval.
const popDurationMs = computed(() => (ROUND_MS / store.state.speed) * 0.3)
</script>

<template>
  <svg
    :key="panelGraphKey"
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
        :cx="node.x"
        :cy="node.y"
        r="4"
        fill="var(--spread)"
      />
      <circle v-else :cx="node.x" :cy="node.y" r="3" fill="var(--unreached)" />
    </g>
    <circle
      v-if="echoPoint"
      class="echo"
      :cx="echoPoint.x"
      :cy="echoPoint.y"
      r="6.5"
      fill="none"
      stroke="var(--ink)"
      stroke-width="2"
    />
    <!-- Transparent hit halos keep 4 px dots hoverable and tappable. -->
    <circle
      v-for="(point, nodeIndex) in layout"
      :key="`hit-${nodeIndex}`"
      :cx="point.x"
      :cy="point.y"
      r="12"
      fill="transparent"
      @pointerenter="setHoveredNode(panel.id, nodeIndex, $event)"
      @pointermove="moveHoveredNode($event)"
      @pointerleave="clearHoveredNode()"
      @click="onNodeClick(nodeIndex, $event)"
    />
  </svg>
</template>

<style scoped>
.net {
  width: 100%;
  height: auto;
  display: block;
  margin-top: 4px;
  /* A graph-seed reroll remounts the svg (keyed by graph hash); the new
     layout fades in (spec 5.3). Skipped under reduced motion globally. */
  animation: layout-fade 200ms ease-out;
}

@keyframes layout-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.echo {
  pointer-events: none;
}

/* A node reached this round fades and scales in the moment its branch
   flips (no delay; the trickle timing lives in nodeDisplayedAsReached).
   The global reduced-motion rule collapses this to a discrete swap. */
.pop {
  animation: pop var(--pop-ms, 300ms) ease-out backwards;
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
