<script setup lang="ts">
import { PAGE_TABS, type PageId } from '@/composables/usePage'
import { useTheme } from '@/composables/useTheme'

// The app bar carries the wordmark (a home link to the model), the page tabs
// (Model plus the planned resource pages), and the theme + source controls.
// The "illustrative, not validated" note now lives under the hero, so it is
// present on the model page without crowding the bar.

defineProps<{ activePage: PageId }>()
const emit = defineEmits<{ navigate: [page: PageId] }>()

const { theme, toggleTheme } = useTheme()
</script>

<template>
  <header class="appbar">
    <div class="in">
      <button
        class="wordmark"
        type="button"
        aria-label="spreadlab home"
        @click="emit('navigate', 'model')"
      >
        <span class="glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="6" cy="6" r="2.2" />
            <circle cx="18" cy="9" r="2.2" />
            <circle cx="10" cy="18" r="2.2" />
            <path d="M8 7l8 1.6M16.5 10.8l-5 5.4M7 8l2.4 8" />
          </svg>
        </span>
        spreadlab
      </button>

      <nav class="tabs" aria-label="Pages">
        <button
          v-for="tab in PAGE_TABS"
          :key="tab.id"
          type="button"
          class="tab"
          :class="{ active: activePage === tab.id }"
          :aria-current="activePage === tab.id ? 'page' : undefined"
          @click="emit('navigate', tab.id)"
        >
          {{ tab.label }}
        </button>
      </nav>

      <span class="grow" />
      <button
        class="iconbtn"
        type="button"
        :aria-label="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
        @click="toggleTheme"
      >
        <svg v-if="theme === 'dark'" class="ic" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M5.6 18.4l1.5-1.5M16.9 7.1l1.5-1.5"
          />
        </svg>
        <svg v-else class="ic" viewBox="0 0 24 24">
          <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" />
        </svg>
      </button>
      <a
        class="iconbtn"
        href="https://github.com/JustinZeus/spreadlab"
        target="_blank"
        rel="noopener"
        aria-label="Source code on GitHub"
      >
        <svg class="ic" viewBox="0 0 24 24">
          <path
            d="M9 19c-4.6 1.4-4.6-2.5-6.5-3m13 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C7.1 2.8 6 3.1 6 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.6 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"
          />
        </svg>
      </a>
    </div>
  </header>
</template>

<style scoped>
.appbar {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 20;
}

.in {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 28px;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.wordmark {
  display: flex;
  align-items: center;
  gap: 9px;
  font-weight: 650;
  font-size: 15.5px;
  letter-spacing: -0.01em;
  color: var(--ink);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  flex: none;
}

.glyph {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--edu), #0d9488);
  display: grid;
  place-items: center;
}

.glyph svg {
  width: 15px;
  height: 15px;
  stroke: #fff;
  fill: none;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.tab {
  font-size: 13.5px;
  font-weight: 550;
  color: var(--ink-3);
  background: none;
  border: none;
  border-radius: 8px;
  padding: 6px 11px;
  cursor: pointer;
  white-space: nowrap;
}

.tab:hover {
  background: var(--bg);
  color: var(--ink);
}

.tab.active {
  background: var(--bg);
  color: var(--ink);
  font-weight: 600;
}

.grow {
  flex: 1;
}

.iconbtn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  background: none;
  color: var(--ink-3);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
}

.iconbtn:hover {
  background: var(--bg);
  color: var(--ink);
}

@media (max-width: 760px) {
  .in {
    padding: 0 12px;
    gap: 8px;
  }

  /* The wordmark text drops to the glyph; the tabs scroll horizontally. */
  .wordmark {
    font-size: 0;
    gap: 0;
  }

  .tabs {
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tabs::-webkit-scrollbar {
    display: none;
  }
}
</style>
