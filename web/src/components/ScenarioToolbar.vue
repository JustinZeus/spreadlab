<script setup lang="ts">
import { computed } from 'vue'
import ExportMenu from './ExportMenu.vue'
import { useSimStore } from '@/composables/useSimStore'
import { MAX_PANELS } from '@/presets/types'

const store = useSimStore()

const atPanelCap = computed(() => store.state.panels.length >= MAX_PANELS)
// A refresh is in flight over existing results; the initial load shows
// skeleton cards instead of this spinner.
const refreshing = computed(
  () => store.state.runState === 'running' && Object.keys(store.state.resultsByPanelId).length > 0,
)

// Spec 5.6: a new panel opens its editor right away.
function addScenario() {
  const addedPanel = store.addPanel()
  if (addedPanel) store.state.editingPanelId = addedPanel.id
}
</script>

<template>
  <div class="toolbar">
    <h2>Scenarios</h2>
    <span v-if="refreshing" class="spinner" role="status" aria-label="Updating scenarios" />
    <span class="grow" />
    <ExportMenu />
    <button
      class="btn primary"
      type="button"
      :disabled="atPanelCap"
      :title="atPanelCap ? 'Maximum 6 scenarios' : undefined"
      @click="addScenario()"
    >
      <svg class="ic" viewBox="0 0 24 24"><path d="M12 6v12M6 12h12" /></svg>
      Add scenario
    </button>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  margin: 30px 0 14px;
  gap: 10px;
}

h2 {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-4);
}

.grow {
  flex: 1;
}

.spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--border);
  border-top-color: var(--ink-3);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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

.btn:hover:not(:disabled) {
  border-color: var(--ink-4);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn.primary {
  background: var(--ink);
  color: var(--surface);
  border-color: var(--ink);
}

.btn svg.ic {
  width: 15px;
  height: 15px;
}

@media (max-width: 760px) {
  .toolbar {
    margin-top: 16px;
  }

  /* Keep the toolbar one row down to 320 px with comfortable touch
     targets; ExportMenu collapses itself to an icon. */
  .btn {
    min-height: 44px;
  }
}
</style>
