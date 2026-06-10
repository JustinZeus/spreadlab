<script setup lang="ts">
import { onMounted } from 'vue'
import AppBar from '@/components/AppBar.vue'
import ControlsCard from '@/components/ControlsCard.vue'
import ErrorBanner from '@/components/ErrorBanner.vue'
import FocusModal from '@/components/FocusModal.vue'
import FooterDisclaimer from '@/components/FooterDisclaimer.vue'
import HeroHeadline from '@/components/HeroHeadline.vue'
import LegendRow from '@/components/LegendRow.vue'
import NodeTooltip from '@/components/NodeTooltip.vue'
import PanelGrid from '@/components/PanelGrid.vue'
import PlayerBar from '@/components/PlayerBar.vue'
import ReachChart from '@/components/ReachChart.vue'
import ResultsTable from '@/components/ResultsTable.vue'
import ScenarioToolbar from '@/components/ScenarioToolbar.vue'
import { usePlayback } from '@/composables/usePlayback'
import { useSimStore } from '@/composables/useSimStore'
import { useTheme } from '@/composables/useTheme'

const store = useSimStore()
const playback = usePlayback()
useTheme() // resolve and apply the theme before first paint of the app

onMounted(async () => {
  await store.initialize()
  playback.autoplayOnce()
})
</script>

<template>
  <AppBar />
  <main class="page">
    <HeroHeadline />
    <ScenarioToolbar />
    <ErrorBanner />
    <PanelGrid />
    <LegendRow />
    <PlayerBar />
    <div class="lower">
      <ReachChart />
      <ControlsCard />
    </div>
    <ResultsTable
      :panels="store.state.panels"
      :results-by-panel-id="store.state.resultsByPanelId"
      :base="store.state.base"
    />
  </main>
  <FooterDisclaimer />
  <FocusModal v-if="store.state.focusPanelId" />
  <NodeTooltip />
  <div class="visually-hidden" aria-live="polite">{{ store.state.announcement }}</div>
</template>

<style scoped>
.page {
  max-width: 1240px;
  margin: 0 auto;
  padding: 36px 28px 30px;
}

.lower {
  display: grid;
  grid-template-columns: 7fr 5fr;
  gap: 18px;
  margin-top: 26px;
  align-items: start;
}

@media (max-width: 760px) {
  .page {
    padding: 22px 16px;
  }

  .lower {
    grid-template-columns: 1fr;
  }
}
</style>
