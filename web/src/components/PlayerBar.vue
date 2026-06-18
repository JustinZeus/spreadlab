<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { usePlayback } from '@/composables/usePlayback'
import { useSimStore } from '@/composables/useSimStore'

// The centered player pill (spec 5.4): replay, step back, play/pause,
// step forward, a native range scrubber (one tick per round), the round
// counter over the global max, and the speed pill. Space, ArrowLeft/Right
// and Home/End work globally except in text inputs; on the scrubber the
// browser handles them natively.

// The modal docks a second PlayerBar over the same store; only the page
// instance owns the global keyboard map so keys are not handled twice.
const props = withDefaults(defineProps<{ globalKeys?: boolean; wide?: boolean }>(), {
  globalKeys: true,
  wide: false,
})

const store = useSimStore()
const playback = usePlayback()

const scrubber = ref<HTMLInputElement | null>(null)

const finalRound = computed(() => store.maxRounds())
const hasRounds = computed(() => finalRound.value > 0)
const atEnd = computed(() => store.state.round >= finalRound.value)
const progressPct = computed(() =>
  hasRounds.value ? (store.state.round / finalRound.value) * 100 : 0,
)

function onScrubInput(event: Event) {
  playback.seekTo(Number((event.target as HTMLInputElement).value))
}

function onGlobalKeydown(event: KeyboardEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null
  // Text-like fields keep their keys; the scrubber handles arrows and
  // Home/End natively; buttons keep Space for activation.
  if (target?.closest('input:not([type=range]), textarea, select, [contenteditable="true"]')) return
  const onScrubber = target === scrubber.value
  switch (event.key) {
    case ' ':
      if (!onScrubber && target?.closest('button, a, summary, [role="dialog"]')) return
      event.preventDefault()
      playback.toggle()
      break
    case 'ArrowLeft':
      if (onScrubber) return
      event.preventDefault()
      playback.stepBack()
      break
    case 'ArrowRight':
      if (onScrubber) return
      event.preventDefault()
      playback.stepForward()
      break
    case 'Home':
      if (onScrubber) return
      event.preventDefault()
      playback.seekTo(0)
      playback.announceRound()
      break
    case 'End':
      if (onScrubber) return
      event.preventDefault()
      playback.seekTo(finalRound.value)
      playback.announceRound()
      break
  }
}

onMounted(() => {
  if (props.globalKeys) document.addEventListener('keydown', onGlobalKeydown)
})
onBeforeUnmount(() => {
  if (props.globalKeys) document.removeEventListener('keydown', onGlobalKeydown)
})
</script>

<template>
  <div class="playerwrap">
    <div class="player" :class="{ wide }">
      <button
        class="iconbtn"
        type="button"
        :disabled="!hasRounds"
        aria-label="Replay from the start"
        @click="playback.replay()"
      >
        <svg class="ic" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 2.6-6.3M5 3v4h4" /></svg>
      </button>
      <button
        class="iconbtn step"
        type="button"
        :disabled="!hasRounds || store.state.round === 0"
        aria-label="Back one round"
        @click="playback.stepBack()"
      >
        <svg class="ic" viewBox="0 0 24 24"><path d="M17 6l-7 6 7 6M7 6v12" /></svg>
      </button>
      <button
        class="iconbtn play"
        type="button"
        :disabled="!hasRounds"
        :aria-label="store.state.playing ? 'Pause' : atEnd ? 'Replay' : 'Play'"
        @click="playback.toggle()"
      >
        <svg v-if="store.state.playing" class="ic filled" viewBox="0 0 24 24">
          <path d="M7.5 5.5h3v13h-3zM13.5 5.5h3v13h-3z" />
        </svg>
        <svg v-else-if="atEnd" class="ic" viewBox="0 0 24 24">
          <path d="M3 12a9 9 0 1 0 2.6-6.3M5 3v4h4" />
        </svg>
        <svg v-else class="ic filled" viewBox="0 0 24 24">
          <path
            d="M8.5 6.2v11.6c0 .8.9 1.3 1.6.9l9-5.8a1 1 0 0 0 0-1.8l-9-5.8a1.05 1.05 0 0 0-1.6.9z"
          />
        </svg>
      </button>
      <button
        class="iconbtn step"
        type="button"
        :disabled="!hasRounds || atEnd"
        aria-label="Forward one round"
        @click="playback.stepForward()"
      >
        <svg class="ic" viewBox="0 0 24 24"><path d="M7 6l7 6-7 6M17 6v12" /></svg>
      </button>
      <div class="scrub">
        <span
          v-for="tick in Math.max(finalRound - 1, 0)"
          :key="tick"
          class="tick"
          :style="{ left: `${(tick / finalRound) * 100}%` }"
          aria-hidden="true"
        />
        <input
          ref="scrubber"
          type="range"
          min="0"
          :max="finalRound"
          step="1"
          :value="store.state.round"
          :disabled="!hasRounds"
          :style="{ '--progress': `${progressPct}%` }"
          aria-label="Round"
          :aria-valuetext="`Round ${store.state.round} of ${finalRound}`"
          @input="onScrubInput"
          @change="playback.announceRound()"
        />
      </div>
      <span class="meta">Round {{ store.state.round }} of {{ finalRound }}</span>
      <button
        class="pill"
        type="button"
        :aria-label="`Playback speed ${store.state.speed}x, change`"
        @click="playback.cycleSpeed()"
      >
        {{ store.state.speed }}&times;
      </button>
    </div>
  </div>
</template>

<style scoped>
.playerwrap {
  display: flex;
  justify-content: center;
  margin-top: 26px;
}

.player {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow: var(--shadow);
  padding: 8px 18px 8px 10px;
  width: min(680px, 100%);
}

/* On the dashboard the player spans the full content width (the modal keeps
   the centered pill). */
.player.wide {
  width: 100%;
}

.iconbtn {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: none;
  background: none;
  color: var(--ink-3);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
}

.iconbtn:hover:not(:disabled) {
  background: var(--bg);
  color: var(--ink);
}

.iconbtn:disabled {
  opacity: 0.4;
  cursor: default;
}

.iconbtn.play {
  width: 42px;
  height: 42px;
  background: var(--ink);
  color: var(--surface);
}

.iconbtn.play:hover:not(:disabled) {
  background: var(--ink);
  opacity: 0.9;
  color: var(--surface);
}

svg.ic.filled {
  fill: currentColor;
  stroke: none;
}

.scrub {
  flex: 1;
  position: relative;
  height: 28px;
  margin: 0 10px;
  display: flex;
  align-items: center;
}

.tick {
  position: absolute;
  top: 12.5px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--ink-4);
  transform: translateX(-2px);
  pointer-events: none;
  z-index: 1;
}

input[type='range'] {
  appearance: none;
  width: 100%;
  height: 28px;
  margin: 0;
  background: transparent;
  cursor: pointer;
}

input[type='range']:disabled {
  cursor: default;
}

input[type='range']::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    var(--ink) var(--progress, 0%),
    var(--border) var(--progress, 0%)
  );
}

input[type='range']::-webkit-slider-thumb {
  appearance: none;
  width: 17px;
  height: 17px;
  margin-top: -7px;
  border-radius: 50%;
  background: var(--surface);
  border: 2px solid var(--ink);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
  position: relative;
  z-index: 2;
}

input[type='range']::-moz-range-track {
  height: 3px;
  border-radius: 3px;
  background: var(--border);
}

input[type='range']::-moz-range-progress {
  height: 3px;
  border-radius: 3px;
  background: var(--ink);
}

input[type='range']::-moz-range-thumb {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--surface);
  border: 2px solid var(--ink);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
}

.meta {
  font-size: 13px;
  font-weight: 550;
  color: var(--ink-3);
  white-space: nowrap;
}

.pill {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-2);
  background: none;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 11px;
  margin-left: 10px;
  cursor: pointer;
}

@media (max-width: 760px) {
  .playerwrap {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 15;
    margin: 0;
  }

  .player {
    box-shadow: var(--shadow-lift);
  }

  .player .pill,
  .player .iconbtn.step {
    display: none;
  }

  /* 44 px touch targets (spec section 8). */
  .iconbtn {
    width: 44px;
    height: 44px;
  }

  .iconbtn.play {
    width: 48px;
    height: 48px;
  }
}
</style>
