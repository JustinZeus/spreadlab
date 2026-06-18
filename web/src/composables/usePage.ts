import { ref } from 'vue'

// Lightweight hash routing for the top-level pages (no Vue Router). The
// dashboard ("model") lives at the bare URL so its query-string state stays
// clean; the informational pages get a shareable hash (e.g. /#explainer).

export type PageId = 'model' | 'explainer' | 'findings' | 'guides'

export interface PageTab {
  id: PageId
  label: string
}

export const PAGE_TABS: PageTab[] = [
  { id: 'model', label: 'Model' },
  { id: 'explainer', label: 'Explainer' },
  { id: 'findings', label: 'Findings' },
  { id: 'guides', label: 'Guides' },
]

const PAGE_IDS = PAGE_TABS.map((tab) => tab.id) as string[]

function pageFromHash(): PageId {
  const raw = window.location.hash.replace(/^#\/?/, '')
  return PAGE_IDS.includes(raw) && raw !== 'model' ? (raw as PageId) : 'model'
}

// Module singleton so every component reads the same active page; the
// hashchange listener is registered once.
const activePage = ref<PageId>(pageFromHash())

window.addEventListener('hashchange', () => {
  activePage.value = pageFromHash()
})

export function usePage() {
  function navigate(page: PageId) {
    if (page === 'model') {
      // Strip the hash without a reload, preserving the dashboard's query.
      if (window.location.hash) {
        history.replaceState(history.state, '', window.location.pathname + window.location.search)
      }
      activePage.value = 'model'
    } else {
      // Setting the hash fires hashchange, which updates activePage.
      window.location.hash = page
    }
  }

  return { activePage, navigate }
}
