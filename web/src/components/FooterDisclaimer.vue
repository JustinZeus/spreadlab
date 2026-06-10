<template>
  <footer class="footer">
    <div class="in">
      <span>
        <em>Illustrative (not validated output)</em> · an agent‑based toy model, parameters chosen
        for clarity
      </span>
      <span>spreadlab · AGPL</span>
    </div>
  </footer>
</template>

<style scoped>
.footer .in {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 28px 48px;
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  color: var(--ink-4);
}

em {
  font-style: italic;
}

@media (max-width: 760px) {
  .footer .in {
    flex-direction: column;
    gap: 4px;
    padding: 0 16px 110px;
  }
}
</style>
