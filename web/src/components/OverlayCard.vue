<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// A lightweight modal sheet for the on-demand views (reach chart, data
// table) in the single-screen layout: scrim, centered card, Esc / scrim /
// close-button dismissal. Focus moves to the close button on open; the
// full focus-trap of FocusModal is overkill for read-only content and is
// revisited in the accessibility pass.

defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()

const closeButton = ref<HTMLButtonElement | null>(null)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  closeButton.value?.focus()
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="scrim" @click.self="emit('close')">
    <div class="sheet" role="dialog" aria-modal="true" :aria-label="title">
      <div class="sheet-head">
        <h2>{{ title }}</h2>
        <button ref="closeButton" class="close" type="button" aria-label="Close" @click="emit('close')">
          <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div class="sheet-body">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(15, 23, 42, 0.5);
  display: grid;
  place-items: center;
  padding: 24px;
}

.sheet {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 24px 64px -16px rgba(15, 23, 42, 0.4);
  width: min(760px, 100%);
  max-height: 85dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-soft);
}

h2 {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: none;
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
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.sheet-body {
  padding: 18px;
  overflow: auto;
}
</style>
