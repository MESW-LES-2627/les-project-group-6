<template>
  <footer class="page-column">
    <p class="footer">
      Bookmarked · <a href="#">Help</a> · <a href="#">Privacy</a> · <a href="#">Terms</a>
    </p>
  </footer>
</template>

<style scoped>
/* A flex item with auto margins shrinks to its content, so take the full width back */
footer {
  width: 100%;
}

.footer {
  margin: 0;
  padding: 18px 0 28px;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.footer a {
  color: var(--color-text-muted);
}

.footer a:hover {
  color: var(--color-text);
}
</style>
