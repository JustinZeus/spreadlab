<script setup lang="ts">
import { computed, useId } from 'vue'

// One labelled lever (spec 5.2): the thumb moves immediately on input,
// the store debounces the actual rerun. Teal accent per the token table.

const props = defineProps<{
  label: string
  hint: string
  value: number
  min: number
  max: number
  step: number
  displayValue: string
  invalid?: boolean
}>()

const emit = defineEmits<{ update: [value: number] }>()

const inputId = useId()

const progressPct = computed(() =>
  props.max > props.min ? ((props.value - props.min) / (props.max - props.min)) * 100 : 0,
)

function onInput(event: Event) {
  const nextValue = (event.target as HTMLInputElement).valueAsNumber
  if (Number.isFinite(nextValue)) emit('update', nextValue)
}
</script>

<template>
  <div class="row" :class="{ invalid }">
    <label :for="inputId">
      {{ label }}
      <span class="hint">{{ hint }}</span>
    </label>
    <input
      :id="inputId"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="value"
      :style="{ '--progress': `${progressPct}%` }"
      :aria-valuetext="displayValue"
      :aria-invalid="invalid || undefined"
      @input="onInput"
    />
    <span class="val">{{ displayValue }}</span>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 150px 1fr 78px;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
}

label {
  font-size: 14px;
  font-weight: 550;
  color: var(--ink-2);
}

.hint {
  display: block;
  font-size: 12px;
  font-weight: 400;
  color: var(--ink-4);
  margin-top: 1px;
}

.val {
  justify-self: end;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
  background: var(--bg);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  padding: 3px 10px;
  white-space: nowrap;
}

.row.invalid .val {
  border-color: var(--spread);
  color: var(--spread);
}

input[type='range'] {
  appearance: none;
  width: 100%;
  height: 20px;
  margin: 0;
  background: transparent;
  cursor: pointer;
}

input[type='range']::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    var(--edu) var(--progress, 0%),
    var(--border) var(--progress, 0%)
  );
}

input[type='range']::-webkit-slider-thumb {
  appearance: none;
  width: 15px;
  height: 15px;
  margin-top: -6px;
  border-radius: 50%;
  background: var(--surface);
  border: 2px solid var(--edu);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
}

input[type='range']::-moz-range-track {
  height: 3px;
  border-radius: 3px;
  background: var(--border);
}

input[type='range']::-moz-range-progress {
  height: 3px;
  border-radius: 3px;
  background: var(--edu);
}

input[type='range']::-moz-range-thumb {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--surface);
  border: 2px solid var(--edu);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
}

/* Stack (label above the track) when the controls container is narrow,
   e.g. inside the sidebar or on mobile. */
@container controls (max-width: 380px) {
  .row {
    grid-template-columns: 1fr 78px;
    gap: 8px 14px;
    margin-top: 14px;
  }

  label {
    grid-column: 1 / -1;
  }
}
</style>
