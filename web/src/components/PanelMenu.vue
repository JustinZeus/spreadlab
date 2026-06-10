<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// The kebab dropdown (spec 5.7). Items come from the panel; the menu
// handles roving focus (arrows), Esc, and outside clicks. The opener
// restores focus on close.

export interface PanelMenuItem {
  key: string
  label: string
  disabled?: boolean
}

const props = defineProps<{ items: PanelMenuItem[]; anchor: HTMLElement | null }>()
const emit = defineEmits<{ select: [key: string]; close: [] }>()

const menu = ref<HTMLElement | null>(null)

function menuButtons(): HTMLButtonElement[] {
  return Array.from(menu.value?.querySelectorAll('button:not(:disabled)') ?? [])
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' || event.key === 'Tab') {
    // Tab closes like Esc instead of leaking focus behind the menu; the
    // opener restores focus and the next Tab continues from there.
    event.preventDefault()
    emit('close')
    return
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  const buttons = menuButtons()
  if (buttons.length === 0) return
  const activeIndex = buttons.findIndex((button) => button === document.activeElement)
  const offset = event.key === 'ArrowDown' ? 1 : -1
  const nextIndex = (activeIndex + offset + buttons.length) % buttons.length
  buttons[nextIndex]?.focus()
}

function onPointerDown(event: PointerEvent) {
  const target = event.target as Node
  if (menu.value?.contains(target)) return
  if (props.anchor?.contains(target)) return
  emit('close')
}

onMounted(() => {
  menuButtons()[0]?.focus()
  document.addEventListener('pointerdown', onPointerDown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown, true)
})
</script>

<template>
  <div ref="menu" class="menu" role="menu" @keydown="onKeydown">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      role="menuitem"
      :disabled="item.disabled"
      @click="emit('select', item.key)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<style scoped>
.menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 25;
  min-width: 150px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-lift);
  padding: 5px;
  display: flex;
  flex-direction: column;
}

button {
  text-align: left;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink-2);
  background: none;
  border: none;
  border-radius: 8px;
  padding: 7px 10px;
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: var(--bg);
  color: var(--ink);
}

button:disabled {
  color: var(--ink-4);
  cursor: default;
}
</style>
