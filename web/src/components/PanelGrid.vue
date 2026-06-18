<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ScenarioPanel from './ScenarioPanel.vue'
import { useSimStore } from '@/composables/useSimStore'
import { accentForPanel } from '@/lib/accents'
import { MAX_PANELS } from '@/presets/types'

const store = useSimStore()

// Initial-load failure (spec 5.1): nothing rendered yet, so the panel area
// itself carries the message; nothing else is dimmed.
const unreachable = computed(
  () =>
    store.state.runState === 'error' &&
    store.state.errorMessage !== null &&
    Object.keys(store.state.resultsByPanelId).length === 0,
)

const apiBaseUrl = `${window.location.origin}/api`

const canAdd = computed(() => store.state.panels.length < MAX_PANELS)

// Append a panel and open its editor (the + tile replaces the old toolbar
// button).
function addScenario() {
  const added = store.addPanel()
  if (added) store.state.editingPanelId = added.id
}

// Size each grid row to exactly half the visible grid height so the 2x2 is
// always fully visible and a fifth scenario spills into a scrolling third
// row. Only while the dashboard is locked to one screen (matches App.vue's
// gate); otherwise the CSS fallback and natural flow apply.
const gridElement = ref<HTMLElement | null>(null)
const ROW_GAP_PX = 16
const oneScreen = window.matchMedia('(min-width: 761px) and (min-height: 760px)')
let rowObserver: ResizeObserver | null = null

function syncRowHeight() {
  const element = gridElement.value
  if (!element) return
  if (oneScreen.matches) {
    // clientHeight includes the container's padding (which gives the card
    // shadows room); subtract it so two rows fit the content area exactly.
    const style = getComputedStyle(element)
    const padV = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
    const available = element.clientHeight - padV
    const rowHeight = Math.max(150, Math.floor((available - ROW_GAP_PX) / 2))
    element.style.setProperty('--row-h', `${rowHeight}px`)
  } else {
    element.style.removeProperty('--row-h')
  }
}

onMounted(() => {
  rowObserver = new ResizeObserver(syncRowHeight)
  if (gridElement.value) rowObserver.observe(gridElement.value)
  oneScreen.addEventListener('change', syncRowHeight)
  syncRowHeight()
})
onBeforeUnmount(() => {
  rowObserver?.disconnect()
  oneScreen.removeEventListener('change', syncRowHeight)
})
</script>

<template>
  <div ref="gridElement" class="panelgrid">
    <div v-if="unreachable" class="unreachable" role="alert">
      <p>
        Could not reach the spreadlab API at <code>{{ apiBaseUrl }}</code>
      </p>
      <button class="retry" type="button" @click="store.retry()">Retry</button>
    </div>
    <div v-else class="panels">
      <ScenarioPanel
        v-for="(panel, panelIndex) in store.state.panels"
        :key="panel.id"
        :panel="panel"
        :accent="accentForPanel(panelIndex)"
      />
      <button v-if="canAdd" class="add-tile" type="button" @click="addScenario()">
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add scenario
      </button>
    </div>
  </div>
</template>

<style scoped>
.panelgrid {
  min-height: 0;
}

.panels {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: var(--row-h, minmax(180px, 1fr));
  gap: 16px;
}

.add-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 180px;
  border: 1.5px dashed var(--border);
  border-radius: var(--radius);
  background: none;
  color: var(--ink-4);
  font-size: 14.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s;
}

.add-tile:hover {
  border-color: var(--edu);
  color: var(--edu);
  background: var(--surface);
}

.add-tile svg.ic {
  width: 46px;
  height: 46px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.unreachable {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 24px;
  text-align: center;
  color: var(--ink-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.unreachable code {
  font-size: 13px;
  color: var(--ink-2);
}

.retry {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--surface);
  background: var(--ink);
  border: 1px solid var(--ink);
  border-radius: 10px;
  padding: 8px 16px;
  cursor: pointer;
}

/* Desktop: the grid fills the height its parent gives it (App.vue makes the
   grid a flex child) and scrolls internally past four scenarios. */
@media (min-width: 761px) {
  .panelgrid {
    overflow-y: auto;
    /* Room so the card shadows are not clipped at the scroll edges; the right
       also leaves the scrollbar gutter. syncRowHeight subtracts this padding
       so the 2x2 still fits exactly. */
    padding: 4px 14px 14px 6px;
    scrollbar-gutter: stable;
  }
}

@media (max-width: 760px) {
  .panels {
    grid-template-columns: 1fr;
    grid-auto-rows: auto;
    gap: 14px;
  }

  .add-tile {
    min-height: 120px;
  }
}
</style>
