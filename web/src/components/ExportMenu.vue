<script setup lang="ts">
import { computed, ref } from 'vue'
import PanelMenu, { type PanelMenuItem } from './PanelMenu.vue'
import { useSimStore } from '@/composables/useSimStore'
import { exportCsv, exportJson, exportPng } from '@/lib/export'

// The toolbar's Export dropdown (spec 5.9). Items disable while a run is
// in flight so an export always captures settled state.

const store = useSimStore()

const open = ref(false)
const exporting = ref(false)
const button = ref<HTMLButtonElement | null>(null)

const busy = computed(
  () =>
    store.state.runState === 'running' ||
    exporting.value ||
    Object.keys(store.state.resultsByPanelId).length === 0,
)

const items = computed<PanelMenuItem[]>(() => [
  { key: 'json', label: 'Data (JSON)', disabled: busy.value },
  { key: 'csv', label: 'Per-node CSV', disabled: busy.value },
  { key: 'png', label: 'Picture (PNG)', disabled: busy.value },
])

async function onSelect(itemKey: string) {
  open.value = false
  button.value?.focus()
  if (busy.value) return
  if (itemKey === 'json') {
    exportJson(store)
  } else if (itemKey === 'csv') {
    exportCsv(store)
  } else if (itemKey === 'png') {
    exporting.value = true
    try {
      await exportPng(store)
    } finally {
      exporting.value = false
    }
  }
}

function closeMenu() {
  open.value = false
  button.value?.focus()
}
</script>

<template>
  <span class="anchor">
    <button
      ref="button"
      class="btn"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="open"
      aria-label="Export"
      @click="open = !open"
    >
      <svg class="ic" viewBox="0 0 24 24"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" /></svg>
      <span class="btn-text">Export</span>
    </button>
    <PanelMenu v-if="open" :items="items" :anchor="button" @select="onSelect" @close="closeMenu" />
  </span>
</template>

<style scoped>
.anchor {
  position: relative;
  display: inline-flex;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1;
  color: var(--ink-2);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.btn:hover {
  border-color: var(--ink-4);
}

.btn svg.ic {
  width: 15px;
  height: 15px;
}

@media (max-width: 760px) {
  .btn {
    min-height: 44px;
  }

  .btn-text {
    display: none;
  }
}
</style>
