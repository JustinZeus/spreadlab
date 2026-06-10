<script setup lang="ts">
import { useSimStore } from '@/composables/useSimStore'

const { preset } = useSimStore()
</script>

<template>
  <div class="legend-block">
    <div class="legend">
      <span class="k"><span class="lg spread" aria-hidden="true" /> Forwarded the fake</span>
      <span class="k"><span class="lg educated" aria-hidden="true" /> Educated to refuse</span>
      <span class="k"><span class="lg unreached" aria-hidden="true" /> Not reached</span>
      <span class="k"><span class="lg origin" aria-hidden="true" /> Origin</span>
    </div>
    <p class="caption">{{ preset.readingCaption }}</p>
  </div>
</template>

<style scoped>
.legend-block {
  margin: 14px 2px 0;
}

.legend {
  display: flex;
  gap: 22px;
  font-size: 13px;
  color: var(--ink-3);
  flex-wrap: wrap;
}

.k {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.lg {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  flex: none;
}

.lg.spread {
  background: var(--spread);
}

.lg.educated {
  width: 8px;
  height: 8px;
  border: 2.5px solid var(--edu);
}

.lg.unreached {
  background: var(--unreached);
}

.lg.origin {
  width: 9px;
  height: 9px;
  border: 2px solid var(--spread);
}

.caption {
  margin-top: 6px;
  font-size: 13px;
  color: var(--ink-3);
}

@media (max-width: 760px) {
  .legend {
    gap: 14px;
  }
}
</style>
