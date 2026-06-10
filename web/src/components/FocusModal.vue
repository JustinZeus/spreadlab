<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import NetworkView from './NetworkView.vue'
import PlayerBar from './PlayerBar.vue'
import { useSimStore } from '@/composables/useSimStore'
import { accentForPanel } from '@/lib/accents'
import { roundPct } from '@/lib/format'
import { reachedCountDisplayed } from '@/lib/reach'

// One panel rendered large (spec 5.8): same SVG, same global round, with
// a PlayerBar docked at the modal footer (both bars share the store, so
// they stay in sync). focusPanelId is URL state, so a shared link opens
// pre-focused. Focus is trapped; Esc, the X, and the scrim close it.

const store = useSimStore()

const panelIndex = computed(() =>
  store.state.panels.findIndex((panel) => panel.id === store.state.focusPanelId),
)
const panel = computed(() =>
  panelIndex.value >= 0 ? store.state.panels[panelIndex.value] : undefined,
)
const result = computed(() =>
  panel.value ? store.state.resultsByPanelId[panel.value.id] : undefined,
)
const numStudents = computed(() =>
  panel.value ? store.effectiveConfig(panel.value).numStudents : 0,
)
const reachedCount = computed(() =>
  result.value
    ? reachedCountDisplayed(
        result.value.reachedAtRound,
        store.state.round,
        store.state.roundProgress,
      )
    : 0,
)
const reachedPctNow = computed(() => (reachedCount.value / Math.max(numStudents.value, 1)) * 100)
const tone = computed(() =>
  roundPct(reachedPctNow.value) <= store.preset.toneThresholdPct ? 'good' : 'bad',
)

const modal = ref<HTMLElement | null>(null)
let openerElement: HTMLElement | null = null

function close() {
  store.setFocusPanel(null)
}

function focusableElements(): HTMLElement[] {
  const selector =
    'button:not(:disabled), [href], input:not(:disabled), select, [tabindex]:not([tabindex="-1"])'
  return Array.from(modal.value?.querySelectorAll<HTMLElement>(selector) ?? [])
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close()
    return
  }
  if (event.key !== 'Tab') return
  const elements = focusableElements()
  const first = elements[0]
  const last = elements[elements.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  openerElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
  focusableElements()[0]?.focus()
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
  openerElement?.focus()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="panel" class="scrim" @click.self="close">
      <div ref="modal" class="modal" role="dialog" aria-modal="true" :aria-label="panel.label">
        <div class="head">
          <span
            class="swatch"
            :style="{ background: accentForPanel(panelIndex) }"
            aria-hidden="true"
          />
          <span class="label">{{ panel.label }}</span>
          <span v-if="result" class="stat" :class="tone">
            {{ roundPct(reachedPctNow) }}%
            <span class="stat-detail">{{ reachedCount }} of {{ numStudents }} reached</span>
          </span>
          <button class="close" type="button" aria-label="Close" @click="close">
            <svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <NetworkView :panel="panel" class="big-net" />
        <div class="dock">
          <PlayerBar :global-keys="false" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(15, 23, 42, 0.5);
  display: grid;
  place-items: center;
  padding: 24px;
}

.modal {
  width: min(1100px, 90vw);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lift);
  padding: 18px 22px 14px;
  overflow: auto;
}

.head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex: none;
}

.label {
  font-size: 15px;
  font-weight: 650;
  color: var(--ink);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat {
  font-size: 17px;
  font-weight: 700;
}

.stat.bad {
  color: var(--spread);
}

.stat.good {
  color: var(--edu);
}

.stat-detail {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-4);
  margin-left: 6px;
}

.close {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  border-radius: 10px;
  color: var(--ink-3);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
}

.close:hover {
  background: var(--bg);
  color: var(--ink);
}

.big-net {
  flex: 1;
  min-height: 0;
}

.dock {
  margin-top: 4px;
}

.dock :deep(.playerwrap) {
  margin-top: 8px;
}

@media (max-width: 760px) {
  .scrim {
    padding: 0;
  }

  .modal {
    width: 100vw;
    height: 100dvh;
    max-height: none;
    border-radius: 0;
    border: none;
  }

  /* Inside the full-screen sheet the docked player keeps its fixed
     bottom position from the mobile player styles; that is the design. */
}
</style>
