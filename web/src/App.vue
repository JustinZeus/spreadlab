<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchDefaultConfig, runComparison } from '@/lib/api'
import type { ComparisonResponse } from '@/types/api'
import ComparisonTable from '@/components/ComparisonTable.vue'

const comparison = ref<ComparisonResponse | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const config = await fetchDefaultConfig()
    comparison.value = await runComparison(config)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  }
})
</script>

<template>
  <main>
    <h1>spreadlab</h1>
    <p>
      How a non-consensual deepfake spreads through a simulated school year
      group, and what an education program changes. Illustrative, not
      validated.
    </p>
    <p v-if="error" role="alert">Could not reach the spreadlab API: {{ error }}</p>
    <ComparisonTable v-else-if="comparison" :comparison="comparison" />
    <p v-else>Running scenarios&hellip;</p>
  </main>
</template>

<style scoped>
main {
  max-width: 48rem;
  margin: 0 auto;
  padding: 2rem 1rem;
}
</style>
