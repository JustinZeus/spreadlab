import { ref } from 'vue'

// Theme handling (spec 5.11): default follows prefers-color-scheme, the
// toggle overrides and persists. Theme is never URL state. index.html
// applies the class before the app mounts to avoid a flash; this module is
// the runtime source of truth.

export type ThemeName = 'light' | 'dark'

const THEME_STORAGE_KEY = 'spreadlab-theme'

const theme = ref<ThemeName>('light')
let initialized = false

function applyTheme(nextTheme: ThemeName) {
  theme.value = nextTheme
  document.documentElement.classList.toggle('dark', nextTheme === 'dark')
}

export function useTheme() {
  if (!initialized) {
    initialized = true
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light')
  }

  function toggleTheme() {
    const nextTheme: ThemeName = theme.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    applyTheme(nextTheme)
  }

  return { theme, toggleTheme }
}
