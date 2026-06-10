<script setup lang="ts">
import { useSimStore } from '@/composables/useSimStore'

// Failed refreshes and invalid shared links (spec 5.1/5.2). Engine 400s do
// not land here; they render inline under the controls card. The last good
// results stay on screen behind this banner.

const store = useSimStore()
</script>

<template>
  <div v-if="store.state.urlStateInvalid" class="banner" role="alert">
    <svg class="ic" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.01" />
    </svg>
    Link contained an invalid configuration, showing defaults
  </div>
  <div v-if="store.state.errorMessage" class="banner" role="alert">
    <svg class="ic" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.01" />
    </svg>
    Could not update: {{ store.state.errorMessage }}
    <button class="retry" type="button" @click="store.retry()">Retry</button>
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 14px;
  padding: 10px 14px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--spread);
  background: var(--spread-soft);
  border: 1px solid color-mix(in srgb, var(--spread) 25%, transparent);
  border-radius: 10px;
}

svg.ic {
  width: 16px;
  height: 16px;
  flex: none;
}

.retry {
  margin-left: auto;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--spread);
  background: none;
  border: 1px solid currentColor;
  border-radius: 8px;
  padding: 3px 10px;
  cursor: pointer;
}
</style>
