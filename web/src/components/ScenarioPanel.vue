<script setup lang="ts">
import { computed, ref } from 'vue'
import NetworkView from './NetworkView.vue'
import PanelEditorPopover from './PanelEditorPopover.vue'
import PanelMenu, { type PanelMenuItem } from './PanelMenu.vue'
import { useSimStore } from '@/composables/useSimStore'
import { roundPct } from '@/lib/format'
import { reachedCountAtRound } from '@/lib/reach'
import { MAX_PANELS, type PanelSpec } from '@/presets/types'

const props = defineProps<{ panel: PanelSpec; accent: string }>()

const store = useSimStore()

const menuOpen = ref(false)
const focusLabelOnOpen = ref(false)
const kebabButton = ref<HTMLButtonElement | null>(null)

const editing = computed(() => store.state.editingPanelId === props.panel.id)
const failed = computed(() => store.state.failedPanelIds.has(props.panel.id))

const menuItems = computed<PanelMenuItem[]>(() => [
  { key: 'edit', label: 'Edit' },
  { key: 'rename', label: 'Rename' },
  { key: 'duplicate', label: 'Duplicate', disabled: store.state.panels.length >= MAX_PANELS },
  { key: 'remove', label: 'Remove', disabled: store.state.panels.length <= 1 },
])

function onMenuSelect(itemKey: string) {
  menuOpen.value = false
  switch (itemKey) {
    case 'edit':
    case 'rename':
      focusLabelOnOpen.value = itemKey === 'rename'
      store.state.editingPanelId = props.panel.id
      break
    case 'duplicate':
      store.duplicatePanel(props.panel.id)
      kebabButton.value?.focus()
      break
    case 'remove':
      store.removePanel(props.panel.id)
      break
  }
}

function closeMenu() {
  menuOpen.value = false
  kebabButton.value?.focus()
}

function closeEditor() {
  store.state.editingPanelId = null
  kebabButton.value?.focus()
}

const result = computed(() => store.state.resultsByPanelId[props.panel.id])
const numStudents = computed(() => store.effectiveConfig(props.panel).numStudents)

// The numbers follow the playhead: they count what the network picture
// shows at the current round, reaching the final outcome on the last one.
const reachedCount = computed(() => {
  const panelResult = result.value
  return panelResult ? reachedCountAtRound(panelResult.reachedAtRound, store.state.round) : 0
})
const reachedPctNow = computed(() => (reachedCount.value / numStudents.value) * 100)
const tone = computed(() =>
  roundPct(reachedPctNow.value) <= store.preset.toneThresholdPct ? 'good' : 'bad',
)

interface PanelChip {
  key: string
  text: string
}

const chips = computed<PanelChip[]>(() => {
  const chipList: PanelChip[] = []
  if (props.panel.strategy !== 'none') {
    chipList.push({ key: 'strategy', text: `strategy · ${props.panel.strategy}` })
  }
  for (const [field, value] of Object.entries(props.panel.overrides)) {
    chipList.push({ key: field, text: `${field} · ${value}` })
  }
  return chipList
})

// Refreshes over existing results dim the card; a panel without any result
// yet renders as a skeleton so the layout never jumps.
const dimmed = computed(() => store.state.runState === 'running' && result.value !== undefined)
</script>

<template>
  <section class="panel" :class="{ dimmed }" :aria-label="panel.label">
    <div class="head">
      <span class="swatch" :style="{ background: accent }" aria-hidden="true" />
      <span class="label">{{ panel.label }}</span>
      <button
        ref="kebabButton"
        class="kebab"
        type="button"
        aria-haspopup="menu"
        :aria-expanded="menuOpen"
        :aria-label="`Scenario menu for ${panel.label}`"
        @click="menuOpen = !menuOpen"
      >
        <svg class="ic" viewBox="0 0 24 24"><path d="M12 6h.01M12 12h.01M12 18h.01" /></svg>
        <span
          v-if="failed"
          class="fail-dot"
          :title="`The last run of ${panel.label} failed; showing its previous result`"
        />
      </button>
      <PanelMenu
        v-if="menuOpen"
        :items="menuItems"
        :anchor="kebabButton"
        @select="onMenuSelect"
        @close="closeMenu"
      />
    </div>
    <PanelEditorPopover
      v-if="editing"
      :panel="panel"
      :focus-label="focusLabelOnOpen"
      @close="closeEditor"
    />
    <template v-if="result">
      <div class="pct" :class="tone">{{ roundPct(reachedPctNow) }}<small>%</small></div>
      <div class="meta">
        <span>{{ reachedCount }} of {{ numStudents }} reached</span>
        <span class="sep" aria-hidden="true">•</span>
        <span>{{ result.numRounds }} rounds</span>
        <span class="sep" aria-hidden="true">•</span>
        <span>{{ result.educated.length }} educated</span>
      </div>
      <div class="chips">
        <span v-for="chip in chips" :key="chip.key" class="chip">{{ chip.text }}</span>
      </div>
      <NetworkView :panel="panel" />
    </template>
    <template v-else>
      <div class="skeleton" aria-hidden="true">
        <div class="bone pct-bone" />
        <div class="bone meta-bone" />
        <div class="bone net-bone" />
      </div>
      <span class="visually-hidden">Running scenario…</span>
    </template>
  </section>
</template>

<style scoped>
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 18px 20px 10px;
  position: relative;
  transition:
    box-shadow 0.15s,
    opacity 0.15s;
}

.panel:hover {
  box-shadow: var(--shadow-lift);
}

.panel.dimmed {
  opacity: 0.6;
}

.head {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.swatch {
  width: 9px;
  height: 9px;
  border-radius: 3px;
  flex: none;
}

.label {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink-2);
  letter-spacing: -0.005em;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kebab {
  color: var(--ink-4);
  margin-right: -6px;
  border: none;
  background: none;
  padding: 4px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  position: relative;
}

.kebab:hover {
  background: var(--bg);
  color: var(--ink);
}

.fail-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--spread);
}

.pct {
  margin-top: 10px;
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
}

.pct small {
  font-size: 22px;
  font-weight: 600;
  color: var(--ink-4);
  letter-spacing: 0;
}

.pct.bad {
  color: var(--spread);
}

.pct.good {
  color: var(--edu);
}

.meta {
  margin-top: 7px;
  font-size: 12.5px;
  color: var(--ink-4);
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  align-items: center;
}

.meta span {
  white-space: nowrap;
}

.meta .sep {
  color: var(--border);
}

.chips {
  display: flex;
  gap: 6px;
  margin-top: 9px;
  min-height: 22px;
  flex-wrap: wrap;
}

.chip {
  font-size: 11.5px;
  font-weight: 550;
  color: var(--ink-3);
  background: var(--bg);
  border: 1px solid var(--border-soft);
  border-radius: 7px;
  padding: 2px 8px;
}

/* Skeleton card (spec 5.1): same vertical rhythm as a loaded panel. */
.skeleton .bone {
  border-radius: 8px;
  background: linear-gradient(
    100deg,
    var(--border-soft) 40%,
    var(--bg) 50%,
    var(--border-soft) 60%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.pct-bone {
  width: 96px;
  height: 40px;
  margin-top: 10px;
}

.meta-bone {
  width: 70%;
  height: 13px;
  margin-top: 9px;
}

.net-bone {
  width: 100%;
  aspect-ratio: 2 / 1;
  margin-top: 35px;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}
</style>
