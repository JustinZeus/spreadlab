<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppBar from '@/components/AppBar.vue'
import ControlsCard from '@/components/ControlsCard.vue'
import ErrorBanner from '@/components/ErrorBanner.vue'
import ExportMenu from '@/components/ExportMenu.vue'
import FocusModal from '@/components/FocusModal.vue'
import FooterDisclaimer from '@/components/FooterDisclaimer.vue'
import HeroHeadline from '@/components/HeroHeadline.vue'
import LegendRow from '@/components/LegendRow.vue'
import MobileScoreStrip from '@/components/MobileScoreStrip.vue'
import NodeTooltip from '@/components/NodeTooltip.vue'
import OverlayCard from '@/components/OverlayCard.vue'
import PanelGrid from '@/components/PanelGrid.vue'
import PlaceholderPage from '@/components/PlaceholderPage.vue'
import PlayerBar from '@/components/PlayerBar.vue'
import ReachChart from '@/components/ReachChart.vue'
import ResultsTable from '@/components/ResultsTable.vue'
import { usePage } from '@/composables/usePage'
import { usePlayback } from '@/composables/usePlayback'
import { useSimStore } from '@/composables/useSimStore'
import { useTheme } from '@/composables/useTheme'

const store = useSimStore()
const playback = usePlayback()
const { activePage, navigate } = usePage()
useTheme() // resolve and apply the theme before first paint of the app

// The reach chart and data table live behind toggles and open as overlays,
// so the dashboard fits one screen on desktop (no page scroll).
const showChart = ref(false)
const showTable = ref(false)

onMounted(async () => {
  await store.initialize()
  playback.autoplayOnce()
})
</script>

<template>
  <div class="shell">
    <AppBar :active-page="activePage" @navigate="navigate" />
    <main class="page">
      <template v-if="activePage === 'model'">
        <HeroHeadline />
        <MobileScoreStrip />
        <ErrorBanner />
        <div class="workbench">
          <div class="top">
            <PanelGrid class="panels-fill" />
            <aside class="sidebar">
              <ControlsCard />
            </aside>
          </div>
          <div class="dock">
            <LegendRow />
            <PlayerBar wide />
            <div class="view-actions">
              <ExportMenu />
              <button class="view-btn" type="button" @click="showChart = true">
                <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6" />
                </svg>
                Reach over time
              </button>
              <button class="view-btn" type="button" @click="showTable = true">
                <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="4" y="5" width="16" height="14" rx="2" />
                  <path d="M4 10h16M10 10v9" />
                </svg>
                Data table
              </button>
            </div>
          </div>
        </div>
      </template>
      <PlaceholderPage v-else :page="activePage" />
    </main>
    <FooterDisclaimer />
  </div>

  <OverlayCard v-if="showChart" title="Reach over time" @close="showChart = false">
    <ReachChart />
  </OverlayCard>
  <OverlayCard v-if="showTable" title="Reach by scenario" @close="showTable = false">
    <ResultsTable
      embedded
      :panels="store.state.panels"
      :results-by-panel-id="store.state.resultsByPanelId"
      :base="store.state.base"
    />
  </OverlayCard>

  <FocusModal v-if="store.state.focusPanelId" />
  <NodeTooltip />
  <div class="visually-hidden" aria-live="polite">{{ store.state.announcement }}</div>
</template>

<style scoped>
.page {
  max-width: 1320px;
  margin: 0 auto;
  padding: 28px 28px 24px;
}

.workbench {
  margin-top: 18px;
}

.view-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}

.view-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 14px;
  cursor: pointer;
}

.view-btn:hover {
  border-color: var(--ink-4);
  color: var(--ink);
}

.view-btn svg.ic {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Top row: settings sidebar (left) beside the graph grid (right). The dock
   below it (legend, player, view actions) spans the full content width, so
   the timeline includes the sidebar's width. */
@media (min-width: 761px) {
  .workbench {
    display: flex;
    flex-direction: column;
  }

  .top {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    gap: 24px;
    min-height: 0;
  }

  .sidebar {
    grid-column: 1;
    grid-row: 1;
    min-height: 0;
    position: relative;
  }

  /* The card absolutely fills the sidebar, so its own content never grows the
     row: the graph grid defines the height, the sidebar matches it, and the
     card scrolls internally if its content (e.g. Advanced expanded) is taller. */
  .sidebar :deep(.card) {
    position: absolute;
    inset: 0;
    overflow-y: auto;
  }

  .panels-fill {
    grid-column: 2;
    min-width: 0; /* let the panel SVGs shrink inside the grid track */
    min-height: 0;
  }

  .dock {
    margin-top: 16px;
  }
}

/* Snap the dashboard to one screen when the window is tall enough; the graph
   grid takes the leftover height. Short windows fall back to normal scroll
   so nothing clips. */
@media (min-width: 761px) and (min-height: 760px) {
  .shell {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .page {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .workbench {
    flex: 1;
    min-height: 0;
  }

  .top {
    flex: 1;
    min-height: 0;
    grid-template-rows: minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .page {
    padding: 22px 16px;
  }

  .sidebar {
    margin-top: 22px;
  }
}
</style>
