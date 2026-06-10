<script setup lang="ts">
import { onMounted } from 'vue'
import AppBar from '@/components/AppBar.vue'
import ErrorBanner from '@/components/ErrorBanner.vue'
import FooterDisclaimer from '@/components/FooterDisclaimer.vue'
import HeroHeadline from '@/components/HeroHeadline.vue'
import LegendRow from '@/components/LegendRow.vue'
import PanelGrid from '@/components/PanelGrid.vue'
import PlayerBar from '@/components/PlayerBar.vue'
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
    <ResultsTable
      :panels="store.state.panels"
      :results-by-panel-id="store.state.resultsByPanelId"
      :base="store.state.base"
    />
  </main>
  <FooterDisclaimer />
  <div class="visually-hidden" aria-live="polite">{{ store.state.announcement }}</div>
</template>

<style scoped>
.page {
  max-width: 1240px;
  margin: 0 auto;
  padding: 36px 28px 30px;
}

@media (max-width: 760px) {
  .page {
    padding: 22px 16px;
  }
}
</style>
