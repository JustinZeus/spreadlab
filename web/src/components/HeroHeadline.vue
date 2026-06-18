<script setup lang="ts">
import { computed, ref } from 'vue'
import AboutPopover from './AboutPopover.vue'
import { useSimStore } from '@/composables/useSimStore'
import { formatPct, roundPct } from '@/lib/format'

// The grant story in one paragraph. {n} placeholders in the preset
// narrative become each panel's live reached%, toned good or bad against
// the preset threshold; the message must land without interaction.

const { preset, state } = useSimStore()

interface NarrativeSegment {
  kind: 'text' | 'pct'
  text: string
  tone?: 'good' | 'bad' | 'pending'
}

const segments = computed<NarrativeSegment[]>(() =>
  preset.narrative.split(/(\{\d+\})/).map((part) => {
    const placeholder = /^\{(\d+)\}$/.exec(part)
    if (!placeholder) return { kind: 'text', text: part }
    const panel = state.panels[Number(placeholder[1])]
    const result = panel ? state.resultsByPanelId[panel.id] : undefined
    if (!result) return { kind: 'pct', text: '…', tone: 'pending' }
    return {
      kind: 'pct',
      text: formatPct(result.reachedPct),
      tone: roundPct(result.reachedPct) <= preset.toneThresholdPct ? 'good' : 'bad',
    }
  }),
)

const aboutOpen = ref(false)
const noteButton = ref<HTMLButtonElement | null>(null)

function closeAbout() {
  aboutOpen.value = false
  noteButton.value?.focus()
}
</script>

<template>
  <div class="hero">
    <h1>{{ preset.headline }}</h1>
    <p>
      <template v-for="(segment, index) in segments" :key="index">
        <b v-if="segment.kind === 'pct'" :class="segment.tone">{{ segment.text }}</b>
        <template v-else>{{ segment.text }}</template>
      </template>
    </p>
    <span class="disclaimer-note">
      <button
        ref="noteButton"
        type="button"
        class="note-button"
        :aria-expanded="aboutOpen"
        @click="aboutOpen = !aboutOpen"
      >
        <svg class="ic" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8v.01" />
        </svg>
        {{ preset.disclaimerShort }}
      </button>
      <AboutPopover v-if="aboutOpen" :anchor="noteButton" @close="closeAbout" />
    </span>
  </div>
</template>

<style scoped>
.hero {
  max-width: 760px;
}

h1 {
  font-size: 30px;
  line-height: 1.18;
  font-weight: 700;
  letter-spacing: -0.022em;
}

p {
  margin-top: 10px;
  font-size: 16.5px;
  color: var(--ink-3);
  line-height: 1.55;
}

p b {
  font-weight: 650;
}

p b.bad {
  color: var(--spread);
}

p b.good {
  color: var(--edu);
}

p b.pending {
  color: var(--ink-4);
}

.disclaimer-note {
  display: block;
  position: relative;
  margin-top: 10px;
}

.note-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--ink-4);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.note-button svg.ic {
  width: 14px;
  height: 14px;
}

@media (max-width: 760px) {
  h1 {
    font-size: 22px;
  }

  p {
    font-size: 15px;
  }
}
</style>
