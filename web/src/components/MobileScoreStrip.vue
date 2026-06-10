<script setup lang="ts">
import { computed } from 'vue'
import { useSimStore } from '@/composables/useSimStore'
import { roundPct } from '@/lib/format'
import { reachedCountAtRound } from '@/lib/reach'

// Mobile only (spec section 9): a sticky strip of one pill per panel so
// the comparison survives the single-column stack. The percentages follow
// the playhead like the panel cards; tapping a chip scrolls to its panel.

const store = useSimStore()

interface StripChip {
  panelId: string
  label: string
  pctText: string
  tone: 'good' | 'bad' | 'pending'
}

const chips = computed<StripChip[]>(() =>
  store.state.panels.map((panel) => {
    const result = store.state.resultsByPanelId[panel.id]
    if (!result) return { panelId: panel.id, label: panel.label, pctText: '…', tone: 'pending' }
    const numStudents = store.effectiveConfig(panel).numStudents
    const pct = (reachedCountAtRound(result.reachedAtRound, store.state.round) / numStudents) * 100
    return {
      panelId: panel.id,
      label: panel.label,
      pctText: `${roundPct(pct)}%`,
      tone: roundPct(pct) <= store.preset.toneThresholdPct ? 'good' : 'bad',
    }
  }),
)

function scrollToPanel(panelId: string) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document
    .getElementById(`panel-${panelId}`)
    ?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <div class="strip">
    <button
      v-for="chip in chips"
      :key="chip.panelId"
      class="s-chip"
      type="button"
      @click="scrollToPanel(chip.panelId)"
    >
      <span class="s-label">{{ chip.label }}</span>
      <b :class="chip.tone">{{ chip.pctText }}</b>
    </button>
  </div>
</template>

<style scoped>
.strip {
  display: none;
}

@media (max-width: 760px) {
  .strip {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    margin-top: 18px;
    position: sticky;
    top: 56px;
    z-index: 10;
    background: var(--bg);
    padding: 10px 0;
    scrollbar-width: none;
  }

  .s-chip {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 12.5px;
    font-weight: 550;
    color: var(--ink-3);
    box-shadow: var(--shadow);
    cursor: pointer;
  }

  .s-label {
    max-width: 130px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .s-chip b {
    font-size: 15px;
  }

  b.bad {
    color: var(--spread);
  }

  b.good {
    color: var(--edu);
  }

  b.pending {
    color: var(--ink-4);
  }
}
</style>
