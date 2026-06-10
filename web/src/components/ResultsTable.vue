<script setup lang="ts">
import { formatPct } from '@/lib/format'
import type { PanelSpec } from '@/presets/types'
import type { Config, Result } from '@/types/engine'

// The collapsed, accessible counterpart of the panel cards (spec section
// 8): live per-panel numbers as a real table behind a disclosure. Evolved
// from the milestone 2 ComparisonTable.

const props = defineProps<{
  panels: PanelSpec[]
  resultsByPanelId: Record<string, Result>
  base: Config
}>()

const strategyLabels: Record<string, string> = {
  none: 'None',
  random: 'Random',
  'most-connected': 'Most connected',
}

function numStudentsFor(panel: PanelSpec): number {
  return panel.overrides.numStudents ?? props.base.numStudents
}
</script>

<template>
  <details class="results">
    <summary>
      <svg class="ic chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      Data table
    </summary>
    <table>
      <caption>
        Per-scenario results for the current configuration
      </caption>
      <thead>
        <tr>
          <th scope="col">Scenario</th>
          <th scope="col">Strategy</th>
          <th scope="col">Educated</th>
          <th scope="col">Reached</th>
          <th scope="col">Share of school</th>
          <th scope="col">Rounds</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="panel in panels" :key="panel.id">
          <th scope="row">{{ panel.label }}</th>
          <template v-if="resultsByPanelId[panel.id]">
            <td>{{ strategyLabels[panel.strategy] ?? panel.strategy }}</td>
            <td>{{ resultsByPanelId[panel.id]!.educated.length }}</td>
            <td>{{ resultsByPanelId[panel.id]!.numReached }} / {{ numStudentsFor(panel) }}</td>
            <td>{{ formatPct(resultsByPanelId[panel.id]!.reachedPct) }}</td>
            <td>{{ resultsByPanelId[panel.id]!.numRounds }}</td>
          </template>
          <td v-else colspan="5">Running…</td>
        </tr>
      </tbody>
    </table>
  </details>
</template>

<style scoped>
.results {
  margin-top: 26px;
}

summary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-3);
  cursor: pointer;
  list-style: none;
  border-radius: 8px;
  padding: 4px 6px;
}

summary::-webkit-details-marker {
  display: none;
}

.chevron {
  width: 14px;
  height: 14px;
  transition: transform 0.15s;
}

details[open] .chevron {
  transform: rotate(90deg);
}

table {
  border-collapse: collapse;
  margin-top: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 13.5px;
}

caption {
  caption-side: top;
  text-align: left;
  padding-bottom: 8px;
  font-size: 12.5px;
  color: var(--ink-4);
}

th,
td {
  border: 1px solid var(--border-soft);
  padding: 7px 12px;
  text-align: left;
}

thead th {
  background: var(--bg);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-3);
}

tbody th {
  font-weight: 600;
  color: var(--ink-2);
}

td {
  color: var(--ink-2);
}
</style>
