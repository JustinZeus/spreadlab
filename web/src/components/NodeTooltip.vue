<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useNodeHover } from '@/composables/useNodeHover'
import { useSimStore } from '@/composables/useSimStore'
import { graphKey } from '@/lib/graph'

// The single tooltip instance (spec 5.5): student number, state in the
// hovered panel at the current round, and the student's degree. Pointer
// only; the equivalent information lives in the ResultsTable. Dismissed
// by pointerleave (NetworkView), tap elsewhere, or Esc.

const store = useSimStore()
const { hoverPosition, clearHoveredNode } = useNodeHover()

const hoveredNode = computed(() => store.state.hoveredNode)
const panel = computed(() =>
  store.state.panels.find((candidate) => candidate.id === hoverPosition.panelId),
)
const active = computed(() => hoveredNode.value !== null && panel.value !== undefined)

const stateText = computed(() => {
  const node = hoveredNode.value
  const hoveredPanel = panel.value
  if (node === null || !hoveredPanel) return ''
  const config = store.effectiveConfig(hoveredPanel)
  const result = store.state.resultsByPanelId[hoveredPanel.id]
  if (node === config.origin) return 'Origin, posted it'
  if (!result) return ''
  const reachedAt = result.reachedAtRound[node] ?? -1
  const reachedNow = reachedAt >= 0 && reachedAt <= store.state.round
  if (reachedNow) return `Forwarded in round ${reachedAt}`
  if (result.educated.includes(node)) return 'Educated, refused'
  return 'Not reached'
})

const friendsText = computed(() => {
  const node = hoveredNode.value
  const hoveredPanel = panel.value
  if (node === null || !hoveredPanel) return ''
  const edges = store.state.edgesByGraphHash[graphKey(store.effectiveConfig(hoveredPanel))] ?? []
  const degree = edges.filter((edge) => edge[0] === node || edge[1] === node).length
  return `${degree} ${degree === 1 ? 'friend' : 'friends'}`
})

const positionStyle = computed(() => ({
  left: `${Math.min(hoverPosition.clientX + 14, window.innerWidth - 190)}px`,
  top: `${Math.min(hoverPosition.clientY + 14, window.innerHeight - 90)}px`,
}))

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') clearHoveredNode()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="active" class="tooltip" :style="positionStyle" aria-hidden="true">
      <strong>Student {{ hoveredNode }}</strong>
      <span>{{ stateText }}</span>
      <span class="friends">{{ friendsText }}</span>
    </div>
  </Teleport>
</template>

<style scoped>
.tooltip {
  position: fixed;
  z-index: 50;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 130px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow-lift);
  padding: 8px 11px;
  font-size: 12.5px;
  color: var(--ink-2);
}

strong {
  font-size: 13px;
  font-weight: 650;
  color: var(--ink);
}

.friends {
  color: var(--ink-4);
}
</style>
