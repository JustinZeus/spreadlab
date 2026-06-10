<script setup lang="ts">
import { computed } from 'vue'
import ScenarioPanel from './ScenarioPanel.vue'
import { useSimStore } from '@/composables/useSimStore'
import { accentForPanel } from '@/lib/accents'

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
</script>

<template>
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
  </div>
</template>

<style scoped>
.panels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
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

@media (max-width: 760px) {
  .panels {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}
</style>
