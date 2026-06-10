<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useSimStore } from '@/composables/useSimStore'

// Small dialog under the disclaimer badge (spec 5.12): what the model is,
// what it is not, and a link to the source. Esc, outside click, or the
// close button dismiss it; the opener restores focus on close.

const props = defineProps<{ anchor: HTMLElement | null }>()
const emit = defineEmits<{ close: [] }>()

const { preset } = useSimStore()
const popover = ref<HTMLElement | null>(null)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

function onPointerDown(event: PointerEvent) {
  const target = event.target as Node
  if (popover.value?.contains(target)) return
  if (props.anchor?.contains(target)) return // the badge itself toggles
  emit('close')
}

onMounted(() => {
  popover.value?.focus()
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('pointerdown', onPointerDown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('pointerdown', onPointerDown, true)
})
</script>

<template>
  <div ref="popover" class="about" role="dialog" aria-label="About this model" tabindex="-1">
    <h3>About this model</h3>
    <p>{{ preset.disclaimerLong }}</p>
    <p>
      <a href="https://github.com/JustinZeus/spreadlab" target="_blank" rel="noopener">
        Proposal and source on GitHub
      </a>
    </p>
    <button class="close" type="button" aria-label="Close" @click="emit('close')">
      <svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  </div>
</template>

<style scoped>
.about {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 30;
  width: min(420px, calc(100vw - 32px));
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-lift);
  padding: 16px 40px 16px 18px;
}

h3 {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-4);
}

p {
  margin-top: 8px;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--ink-2);
}

a {
  color: var(--edu);
  font-weight: 550;
}

.close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  border-radius: 8px;
  color: var(--ink-3);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.close:hover {
  background: var(--bg);
  color: var(--ink);
}

.close svg.ic {
  width: 14px;
  height: 14px;
}
</style>
