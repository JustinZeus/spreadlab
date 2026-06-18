<script setup lang="ts">
import { computed } from 'vue'
import { useSimStore } from '@/composables/useSimStore'
import { CONFIG_FIELD_LABELS } from '@/lib/fieldLabels'
import type { Config } from '@/types/engine'

// The collapsible advanced grid (spec section 4): world-shaping numbers
// plus the three seeds, each seed with a dice reroll (spec 5.3). "Reroll
// world" rerolls all three at once; the debounced run coalesces them.

const store = useSimStore()

interface NumberFieldDef {
  field: keyof Config
  label: string
  min: number
  max: number | undefined
  step: number
}

// min/max come from the engine's served bounds; until they arrive the
// inputs are unbounded and the store clamps nothing (the engine's own
// validation backstops). origin's ceiling tracks numStudents.
const numberFields = computed<NumberFieldDef[]>(() => {
  const bounds = store.state.bounds
  return [
    {
      field: 'numStudents',
      label: CONFIG_FIELD_LABELS.numStudents,
      min: bounds?.numStudents.min ?? 2,
      max: bounds?.numStudents.max,
      step: 1,
    },
    {
      field: 'edgesPerNode',
      label: CONFIG_FIELD_LABELS.edgesPerNode,
      min: bounds?.edgesPerNode.min ?? 1,
      max: bounds?.edgesPerNode.max,
      step: 1,
    },
    {
      field: 'triangleProb',
      label: CONFIG_FIELD_LABELS.triangleProb,
      min: bounds?.triangleProb.min ?? 0,
      max: bounds?.triangleProb.max,
      step: 0.05,
    },
    {
      field: 'origin',
      label: CONFIG_FIELD_LABELS.origin,
      min: 0,
      max: store.state.base.numStudents - 1,
      step: 1,
    },
  ]
})

interface SeedFieldDef {
  field: keyof Config
  label: string
}

const seedFields: SeedFieldDef[] = [
  { field: 'graphSeed', label: CONFIG_FIELD_LABELS.graphSeed },
  { field: 'thresholdSeed', label: CONFIG_FIELD_LABELS.thresholdSeed },
  { field: 'educationSeed', label: CONFIG_FIELD_LABELS.educationSeed },
]

// The engine's 400 message names the offending Go/JSON field; mark it.
const offendingField = computed(() => {
  const validationError = store.state.validationError
  if (!validationError) return null
  const allFields = [...numberFields.value, ...seedFields].map(({ field }) => field)
  return allFields.find((field) => validationError.includes(field)) ?? null
})

function setField(field: keyof Config, event: Event) {
  const nextValue = (event.target as HTMLInputElement).valueAsNumber
  if (Number.isFinite(nextValue)) store.setBaseField(field, nextValue)
}

// Seeds are just names for worlds; a small range keeps the fields and
// shared URLs readable while still giving plenty of distinct worlds.
function freshSeed(): number {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return (buffer[0] ?? 0) % 10000
}

function reroll(field: keyof Config) {
  store.setBaseField(field, freshSeed())
}

function rerollWorld() {
  for (const { field } of seedFields) store.setBaseField(field, freshSeed())
}
</script>

<template>
  <details class="adv">
    <summary>
      <svg class="ic chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      Advanced
    </summary>
    <div class="grid">
      <label
        v-for="def in numberFields"
        :key="def.field"
        class="field"
        :class="{ invalid: offendingField === def.field }"
      >
        <span class="fl">{{ def.label }}</span>
        <input
          type="number"
          :min="def.min"
          :max="def.max"
          :step="def.step"
          :value="store.state.base[def.field]"
          :aria-invalid="offendingField === def.field || undefined"
          @change="setField(def.field, $event)"
        />
      </label>
      <span
        v-for="def in seedFields"
        :key="def.field"
        class="field"
        :class="{ invalid: offendingField === def.field }"
      >
        <label class="seed">
          <span class="fl">{{ def.label }}</span>
          <input
            type="number"
            min="0"
            step="1"
            :value="store.state.base[def.field]"
            :aria-invalid="offendingField === def.field || undefined"
            @change="setField(def.field, $event)"
          />
        </label>
        <button
          class="dice"
          type="button"
          :aria-label="`Reroll ${def.label}`"
          @click="reroll(def.field)"
        >
          <svg class="ic" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="3" />
            <path d="M9 9h.01M15 15h.01M15 9h.01M9 15h.01" />
          </svg>
        </button>
      </span>
    </div>
    <button class="reroll-world" type="button" @click="rerollWorld()">Reroll world</button>
  </details>
</template>

<style scoped>
.adv {
  margin-top: 20px;
  border-top: 1px solid var(--border-soft);
  padding-top: 14px;
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
  padding: 2px 4px;
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

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 14px;
  margin-top: 12px;
}

.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid var(--border-soft);
  background: var(--bg);
  border-radius: 10px;
  padding: 7px 11px;
  font-size: 13px;
}

.field.invalid {
  border-color: var(--spread);
}

.fl {
  color: var(--ink-3);
  font-weight: 500;
  white-space: nowrap;
}

.seed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

input[type='number'] {
  width: 72px;
  font: 600 13px/1.4 inherit;
  font-family: inherit;
  color: var(--ink-2);
  background: none;
  border: none;
  text-align: right;
  padding: 0;
}

.dice {
  border: none;
  background: none;
  padding: 2px;
  border-radius: 6px;
  color: var(--ink-4);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
}

.dice:hover {
  color: var(--ink);
}

.dice svg.ic {
  width: 14px;
  height: 14px;
}

.reroll-world {
  margin-top: 12px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-3);
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 5px 12px;
  cursor: pointer;
}

.reroll-world:hover {
  border-color: var(--ink-4);
  color: var(--ink);
}

/* Single column when the controls container is narrow (sidebar / mobile). */
@container controls (max-width: 380px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
