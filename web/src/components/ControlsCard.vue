<script setup lang="ts">
import { computed } from 'vue'
import AdvancedFields from './AdvancedFields.vue'
import LeverSlider from './LeverSlider.vue'
import { useSimStore } from '@/composables/useSimStore'
import { formatPct } from '@/lib/format'

// The world card (spec slice 6, extended 2026-06-18 for the literature
// levers): the forwarding composite and the program, grouped so the levers
// read as a structured model rather than a flat wall, plus the advanced
// grid and the inline spot for engine 400s. Lever changes hit the store
// immediately and rerun every panel after the shared debounce.

const store = useSimStore()

const base = computed(() => store.state.base)

const educationDisplay = computed(() => {
  const share = (base.value.numEducated / Math.max(base.value.numStudents, 1)) * 100
  return `${base.value.numEducated} · ${formatPct(share)}`
})

// The engine 400 names the offending JSON field; mark the matching lever.
const offends = (field: string) =>
  computed(() => store.state.validationError?.includes(field) ?? false)

const offendsForwardProb = offends('forwardProb')
const offendsNovelty = offends('novelty')
const offendsHarmAwareness = offends('harmAwareness')
const offendsNumEducated = offends('numEducated')
const offendsProgramEffect = offends('programEffect')
</script>

<template>
  <section class="card ctl" aria-label="World settings">
    <h3>World</h3>
    <p v-if="store.state.validationError" class="invalid-note" role="alert">
      {{ store.state.validationError }}
    </p>

    <div class="group">
      <p class="group-label">The fake</p>
      <LeverSlider
        label="Chance to forward"
        hint="baseline, per friendship"
        :value="base.forwardProb"
        :min="store.state.bounds?.forwardProb.min ?? 0"
        :max="store.state.bounds?.forwardProb.max ?? 1"
        :step="0.01"
        :display-value="formatPct(base.forwardProb * 100)"
        :invalid="offendsForwardProb"
        @update="(value) => store.setBaseField('forwardProb', value)"
      />
      <LeverSlider
        label="Novelty / shock"
        hint="how new or shocking it feels"
        :value="base.novelty"
        :min="store.state.bounds?.novelty.min ?? 0"
        :max="store.state.bounds?.novelty.max ?? 1"
        :step="0.05"
        :display-value="formatPct(base.novelty * 100)"
        :invalid="offendsNovelty"
        @update="(value) => store.setBaseField('novelty', value)"
      />
    </div>

    <div class="group">
      <p class="group-label">The year group</p>
      <LeverSlider
        label="Harm awareness"
        hint="shared AI-literacy in the year"
        :value="base.harmAwareness"
        :min="store.state.bounds?.harmAwareness.min ?? 0"
        :max="store.state.bounds?.harmAwareness.max ?? 1"
        :step="0.05"
        :display-value="formatPct(base.harmAwareness * 100)"
        :invalid="offendsHarmAwareness"
        @update="(value) => store.setBaseField('harmAwareness', value)"
      />
    </div>

    <div class="group">
      <p class="group-label">The program</p>
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
      <LeverSlider
        label="Program strength"
        hint="how much it cuts an educated student's sharing"
        :value="base.programEffect"
        :min="store.state.bounds?.programEffect.min ?? 0"
        :max="store.state.bounds?.programEffect.max ?? 1"
        :step="0.05"
        :display-value="formatPct(base.programEffect * 100)"
        :invalid="offendsProgramEffect"
        @update="(value) => store.setBaseField('programEffect', value)"
      />
    </div>

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
  /* The card is a container so its sliders and advanced grid adapt to the
     sidebar width (narrow -> stacked), not the viewport width. */
  container-type: inline-size;
  container-name: controls;
}

h3 {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-4);
}

.group + .group {
  margin-top: 22px;
  border-top: 1px solid var(--border-soft);
  padding-top: 4px;
}

.group-label {
  margin-top: 16px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-3);
}

.invalid-note {
  margin-top: 8px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--spread);
}
</style>
