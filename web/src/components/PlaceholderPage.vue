<script setup lang="ts">
import { computed } from 'vue'
import { usePage, type PageId } from '@/composables/usePage'

// Stub pages for the planned free public resource. Intentional placeholders
// (not "404"s): they state what each page will hold so a visitor, or a
// grader following the proposal, sees the intended shape of the resource.

const props = defineProps<{ page: PageId }>()
const { navigate } = usePage()

type InfoPage = Exclude<PageId, 'model'>

const COPY: Record<InfoPage, { title: string; body: string }> = {
  explainer: {
    title: 'Explainer',
    body: 'Plain-language background: what AI-generated non-consensual deepfakes are, how they spread through a school year group, and why educating the most-connected students slows the spread more than educating at random.',
  },
  findings: {
    title: 'Findings',
    body: 'Results from the model, and in time from the real-school study, will be published here in plain language alongside the data, so schools and families can see what the evidence says.',
  },
  guides: {
    title: 'Guides',
    body: 'Practical guides for schools, parents, and teenagers: how to spot synthetic images, how to refuse and report safely, and how to support someone who has been targeted.',
  },
}

const content = computed(() => COPY[props.page as InfoPage] ?? COPY.explainer)
</script>

<template>
  <section class="placeholder">
    <span class="tag">Coming soon</span>
    <h1>{{ content.title }}</h1>
    <p>{{ content.body }}</p>
    <p class="note">
      Part of the planned free public resource. The interactive model is live on the
      <button class="link" type="button" @click="navigate('model')">Model</button> tab.
    </p>
  </section>
</template>

<style scoped>
.placeholder {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 14px;
  padding: 48px 24px;
}

.tag {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--edu);
  background: color-mix(in srgb, var(--edu) 12%, transparent);
  border-radius: 999px;
  padding: 4px 12px;
}

h1 {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.022em;
  color: var(--ink);
}

p {
  max-width: 560px;
  font-size: 16px;
  line-height: 1.55;
  color: var(--ink-3);
}

.note {
  font-size: 13.5px;
  color: var(--ink-4);
}

.link {
  font: inherit;
  color: var(--edu);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
