<script setup lang="ts">
import type { ComparisonResponse } from '@/types/api'

defineProps<{ comparison: ComparisonResponse }>()

const strategyLabels: Record<string, string> = {
  none: 'No program',
  random: 'Educate at random',
  'most-connected': 'Educate the most connected',
}
</script>

<template>
  <table>
    <caption>
      Same education budget ({{ comparison.config.numEducated }} of
      {{ comparison.config.numStudents }} students), different targeting
    </caption>
    <thead>
      <tr>
        <th scope="col">Strategy</th>
        <th scope="col">Educated</th>
        <th scope="col">Reached</th>
        <th scope="col">Share of school</th>
        <th scope="col">Rounds</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="result in comparison.results" :key="result.strategy">
        <th scope="row">{{ strategyLabels[result.strategy] ?? result.strategy }}</th>
        <td>{{ result.educated.length }}</td>
        <td>{{ result.numReached }} / {{ comparison.config.numStudents }}</td>
        <td>{{ Math.round(result.reachedPct) }}%</td>
        <td>{{ result.numRounds }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
table {
  border-collapse: collapse;
  margin-top: 1.5rem;
}

caption {
  caption-side: top;
  text-align: left;
  padding-bottom: 0.75rem;
  color: var(--color-text);
}

th,
td {
  border: 1px solid var(--color-border);
  padding: 0.5rem 0.9rem;
  text-align: left;
}

thead th {
  background: var(--color-background-soft);
}
</style>
