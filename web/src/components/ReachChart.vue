<script setup lang="ts">
import { computed } from 'vue'
import { useSimStore } from '@/composables/useSimStore'
import { accentForPanel } from '@/lib/accents'
import { formatPct } from '@/lib/format'
import { reachedCountAtRound } from '@/lib/reach'

// Overlaid cumulative reach curves, one per panel in its accent color,
// with a playhead synced to the global round (spec slice 5). The chart is
// decorative for screen readers; the ResultsTable carries the numbers.

const store = useSimStore()

const CHART_WIDTH = 640
const CHART_HEIGHT = 230
const MARGIN_LEFT = 40
const MARGIN_RIGHT = 56
const MARGIN_TOP = 14
const MARGIN_BOTTOM = 30
const INNER_WIDTH = CHART_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
const INNER_HEIGHT = CHART_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM

const finalRound = computed(() => store.maxRounds())

function roundToX(round: number): number {
  return MARGIN_LEFT + (round / Math.max(finalRound.value, 1)) * INNER_WIDTH
}

function pctToY(pct: number): number {
  return MARGIN_TOP + (1 - pct / 100) * INNER_HEIGHT
}

interface ChartCurve {
  panelId: string
  accent: string
  polylinePoints: string
  endX: number
  endY: number
  endLabel: string
  playheadY: number
}

const curves = computed<ChartCurve[]>(() =>
  store.state.panels.flatMap((panel, panelIndex) => {
    const result = store.state.resultsByPanelId[panel.id]
    if (!result) return []
    const numStudents = store.effectiveConfig(panel).numStudents
    const pctAt = (round: number) =>
      (reachedCountAtRound(result.reachedAtRound, round) / numStudents) * 100
    const points: string[] = []
    for (let round = 0; round <= finalRound.value; round++) {
      points.push(`${roundToX(round).toFixed(1)},${pctToY(pctAt(round)).toFixed(1)}`)
    }
    return [
      {
        panelId: panel.id,
        accent: accentForPanel(panelIndex),
        polylinePoints: points.join(' '),
        endX: roundToX(finalRound.value),
        endY: pctToY(pctAt(finalRound.value)),
        endLabel: formatPct(result.reachedPct),
        playheadY: pctToY(pctAt(store.state.round)),
      },
    ]
  }),
)

const gridLines = computed(() => [0, 25, 50, 75, 100].map((pct) => ({ pct, y: pctToY(pct) })))

// Label every round while they fit; thin out for long runs.
const roundLabels = computed(() => {
  const step = Math.max(1, Math.ceil(finalRound.value / 12))
  const labels: number[] = []
  for (let round = 0; round <= finalRound.value; round += step) labels.push(round)
  return labels
})

const playheadX = computed(() => roundToX(store.state.round))
</script>

<template>
  <section v-if="finalRound > 0" class="card chart" aria-label="Reach over time">
    <h3>Reach over time</h3>
    <svg :viewBox="`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`" aria-hidden="true">
      <line
        v-for="grid in gridLines"
        :key="grid.pct"
        :x1="MARGIN_LEFT"
        :y1="grid.y"
        :x2="CHART_WIDTH - MARGIN_RIGHT"
        :y2="grid.y"
        stroke="var(--border-soft)"
        stroke-width="1"
        :stroke-dasharray="grid.pct > 0 ? '2 4' : undefined"
      />
      <text
        v-for="grid in gridLines"
        :key="`label-${grid.pct}`"
        :x="MARGIN_LEFT - 9"
        :y="grid.y + 3.5"
        text-anchor="end"
        font-size="11"
        fill="var(--ink-4)"
      >
        {{ grid.pct }}
      </text>
      <text
        v-for="round in roundLabels"
        :key="`round-${round}`"
        :x="roundToX(round)"
        :y="CHART_HEIGHT - 8"
        text-anchor="middle"
        font-size="11"
        fill="var(--ink-4)"
      >
        {{ round }}
      </text>

      <line
        :x1="playheadX"
        :y1="MARGIN_TOP"
        :x2="playheadX"
        :y2="CHART_HEIGHT - MARGIN_BOTTOM"
        stroke="var(--ink-4)"
        stroke-width="1"
        opacity="0.55"
      />

      <g v-for="curve in curves" :key="curve.panelId">
        <polyline
          :points="curve.polylinePoints"
          fill="none"
          :stroke="curve.accent"
          stroke-width="2.4"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <circle :cx="playheadX" :cy="curve.playheadY" r="3.5" :fill="curve.accent" />
        <text
          :x="curve.endX + 9"
          :y="curve.endY + 4"
          font-size="12"
          font-weight="650"
          :fill="curve.accent"
        >
          {{ curve.endLabel }}
        </text>
      </g>
    </svg>
  </section>
</template>

<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px 22px;
}

h3 {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-4);
}

svg {
  width: 100%;
  height: auto;
  margin-top: 10px;
}

svg text {
  font-variant-numeric: tabular-nums;
}
</style>
