<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useSimStore } from '@/composables/useSimStore'
import { CONFIG_FIELD_LABELS, STRATEGY_LABELS } from '@/lib/fieldLabels'
import type { PanelSpec } from '@/presets/types'
import type { Config } from '@/types/engine'

// The per-panel config diff editor (spec 5.7): the label is renamed
// inline in the header, the strategy is a select, and every Config field
// is a row showing the base value. Typing a different value creates an
// override (highlighted row, reset icon); typing the base value back
// removes it. Apply follows the store's debounced single-panel rerun.

const props = defineProps<{ panel: PanelSpec; focusLabel?: boolean }>()
const emit = defineEmits<{ close: [] }>()

const store = useSimStore()

const popover = ref<HTMLElement | null>(null)
const labelInput = ref<HTMLInputElement | null>(null)

const fieldNames = Object.keys(store.state.base) as (keyof Config)[]

const offendingField = computed(() => {
  const validationError = store.state.validationError
  if (!validationError) return null
  return fieldNames.find((field) => validationError.includes(field)) ?? null
})

function isOverridden(field: keyof Config): boolean {
  return field in props.panel.overrides
}

function effectiveValue(field: keyof Config): number {
  return props.panel.overrides[field] ?? store.state.base[field]
}

function setOverride(field: keyof Config, event: Event) {
  const nextValue = (event.target as HTMLInputElement).valueAsNumber
  if (Number.isFinite(nextValue)) store.setPanelOverride(props.panel.id, field, nextValue)
}

function rename(event: Event) {
  const label = (event.target as HTMLInputElement).value.trim()
  if (label) store.renamePanel(props.panel.id, label)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

function onPointerDown(event: PointerEvent) {
  if (popover.value?.contains(event.target as Node)) return
  emit('close')
}

onMounted(() => {
  if (props.focusLabel) {
    labelInput.value?.focus()
    labelInput.value?.select()
  } else {
    popover.value?.querySelector('select')?.focus()
  }
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('pointerdown', onPointerDown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('pointerdown', onPointerDown, true)
})
</script>

<template>
  <div
    ref="popover"
    class="editor"
    role="dialog"
    :aria-label="`Edit scenario ${panel.label}`"
    tabindex="-1"
  >
    <div class="head">
      <input
        ref="labelInput"
        class="label-input"
        type="text"
        :value="panel.label"
        aria-label="Scenario name"
        @change="rename"
      />
      <button class="close" type="button" aria-label="Close editor" @click="emit('close')">
        <svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>

    <p v-if="store.state.validationError" class="invalid-note" role="alert">
      {{ store.state.validationError }}
    </p>

    <label class="row strategy">
      <span class="rl">Strategy</span>
      <select
        :value="panel.strategy"
        @change="store.setPanelStrategy(panel.id, ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="(label, strategy) in STRATEGY_LABELS" :key="strategy" :value="strategy">
          {{ label }}
        </option>
      </select>
    </label>

    <div class="rows">
      <div
        v-for="field in fieldNames"
        :key="field"
        class="row"
        :class="{ overridden: isOverridden(field), invalid: offendingField === field }"
      >
        <label class="rl" :for="`${panel.id}-${field}`">{{ CONFIG_FIELD_LABELS[field] }}</label>
        <span class="base" :class="{ hidden: !isOverridden(field) }"
          >base {{ store.state.base[field] }}</span
        >
        <input
          :id="`${panel.id}-${field}`"
          type="number"
          :value="effectiveValue(field)"
          :aria-invalid="offendingField === field || undefined"
          @change="setOverride(field, $event)"
        />
        <button
          v-if="isOverridden(field)"
          class="reset"
          type="button"
          :aria-label="`Reset ${CONFIG_FIELD_LABELS[field]} to the base value`"
          @click="store.clearPanelOverride(panel.id, field)"
        >
          <svg class="ic" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 2.6-6.3M5 3v4h4" /></svg>
        </button>
        <span v-else class="reset-spacer" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor {
  position: absolute;
  top: 44px;
  right: 12px;
  z-index: 25;
  width: min(300px, calc(100% - 24px));
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-lift);
  padding: 12px 14px 14px;
}

.head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label-input {
  flex: 1;
  min-width: 0;
  font: 600 13.5px/1.4 inherit;
  font-family: inherit;
  color: var(--ink);
  background: var(--bg);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  padding: 5px 9px;
}

.close {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  border-radius: 8px;
  color: var(--ink-3);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
}

.close:hover {
  background: var(--bg);
  color: var(--ink);
}

.close svg.ic {
  width: 14px;
  height: 14px;
}

.invalid-note {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--spread);
}

.rows {
  margin-top: 4px;
}

.row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 6px;
  border-radius: 8px;
  font-size: 12.5px;
}

.row.strategy {
  margin-top: 10px;
  padding: 5px 6px;
}

.row.overridden {
  background: var(--edu-soft);
}

.row.invalid {
  outline: 1px solid var(--spread);
}

.rl {
  flex: 1;
  min-width: 0;
  color: var(--ink-3);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.base {
  font-size: 11px;
  color: var(--ink-4);
  white-space: nowrap;
}

.base.hidden {
  visibility: hidden;
}

select {
  font: 600 12.5px/1.4 inherit;
  font-family: inherit;
  color: var(--ink-2);
  background: var(--bg);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  padding: 4px 8px;
}

input[type='number'] {
  width: 72px;
  font: 600 12.5px/1.4 inherit;
  font-family: inherit;
  color: var(--ink-2);
  background: var(--bg);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  padding: 4px 8px;
  text-align: right;
}

.reset {
  width: 22px;
  height: 22px;
  border: none;
  background: none;
  border-radius: 6px;
  color: var(--edu);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
}

.reset svg.ic {
  width: 12px;
  height: 12px;
}

.reset-spacer {
  width: 22px;
  flex: none;
}
</style>
