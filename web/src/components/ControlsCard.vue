<script setup lang="ts">
import { computed } from 'vue'
import AdvancedFields from './AdvancedFields.vue'
import LeverSlider from './LeverSlider.vue'
import { useSimStore } from '@/composables/useSimStore'
import { formatPct } from '@/lib/format'

// The world card (spec slice 6): two headline levers, the advanced grid,
// and the inline spot for engine 400s. Lever changes hit the store
// immediately and rerun every panel after the shared debounce.

const store = useSimStore()

const base = computed(() => store.state.base)

const educationDisplay = computed(() => {
  const share = (base.value.numEducated / Math.max(base.value.numStudents, 1)) * 100
  return `${base.value.numEducated} · ${formatPct(share)}`
})

const offendsForwardProb = computed(
  () => store.state.validationError?.includes('forwardProb') ?? false,
)
const offendsNumEducated = computed(
  () => store.state.validationError?.includes('numEducated') ?? false,
)
</script>

<template>
  <section class="card ctl" aria-label="World settings">
    <h3>World</h3>
    <p v-if="store.state.validationError" class="invalid-note" role="alert">
      {{ store.state.validationError }}
    </p>
    <LeverSlider
      label="Chance to forward"
      hint="per friendship, per round"
      :value="base.forwardProb"
      :min="store.state.bounds?.forwardProb.min ?? 0"
      :max="store.state.bounds?.forwardProb.max ?? 1"
      :step="0.01"
      :display-value="formatPct(base.forwardProb * 100)"
      :invalid="offendsForwardProb"
      @update="(value) => store.setBaseField('forwardProb', value)"
    />
    <LeverSlider
      label="Education budget"
      hint="students the program reaches"
      :value="base.numEducated"
      :min="0"
      :max="base.numStudents"
      :step="1"
      :display-value="educationDisplay"
      :invalid="offendsNumEducated"
      @update="(value) => store.setBaseField('numEducated', value)"
    />
    <AdvancedFields />
  </section>
</template>

<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px 22px;
}

h3 {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-4);
}

.invalid-note {
  margin-top: 8px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--spread);
}
</style>
