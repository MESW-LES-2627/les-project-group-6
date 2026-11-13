<script setup lang="ts">
// Shown while the book detail request is in flight. It mirrors the real page's
// hero and three-column layout so nothing jumps when the content arrives.
</script>

<template>
  <section class="book-detail-skeleton" role="status" aria-busy="true" aria-live="polite">
    <span class="sr-only">Loading book details…</span>

    <header class="hero" aria-hidden="true">
      <div class="hero-copy">
        <span class="bar eyebrow-bar"></span>
        <span class="bar title-bar"></span>
        <span class="bar subtitle-bar"></span>
      </div>
      <span class="bar send-bar"></span>
    </header>

    <div class="layout" aria-hidden="true">
      <div class="side">
        <span class="cover"></span>
        <span class="bar line"></span>
        <span class="bar line short"></span>
      </div>

      <div class="main-column">
        <div class="panel">
          <span class="bar line wide"></span>
          <span class="bar line"></span>
          <span class="bar line short"></span>
          <span class="bar block"></span>
        </div>

        <div class="panel">
          <span class="bar line mid"></span>
          <span class="bar line"></span>
          <span class="bar line"></span>
          <span class="bar line short"></span>
        </div>
      </div>

      <div class="rail">
        <div class="panel">
          <span class="bar line mid"></span>
          <span class="bar line"></span>
          <span class="bar line short"></span>
        </div>
        <div class="panel">
          <span class="bar line mid"></span>
          <span class="bar line"></span>
          <span class="bar line short"></span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.book-detail-skeleton {
  padding: 24px 0 40px;
}

.hero {
  display: flex;
  gap: var(--space-8);
  align-items: flex-start;
  justify-content: space-between;
}

.hero-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.bar,
.cover {
  display: block;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    90deg,
    var(--color-surface-muted) 25%,
    var(--color-surface-hover) 37%,
    var(--color-surface-muted) 63%
  );
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

.eyebrow-bar {
  width: 7rem;
  height: 0.6rem;
}

.title-bar {
  width: min(24rem, 70%);
  height: 2.25rem;
}

.subtitle-bar {
  width: min(30rem, 85%);
  height: 1rem;
}

.send-bar {
  flex: none;
  width: 7.5rem;
  height: 1rem;
  margin-top: 32px;
}

.layout {
  display: grid;
  grid-template-columns: 247px minmax(0, 1fr) 309px;
  gap: 32px;
  align-items: start;
  margin-top: 25px;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cover {
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: var(--radius-cover);
}

.main-column,
.rail {
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.line {
  width: 100%;
  height: 0.75rem;
}

.line.wide {
  width: 55%;
  height: 1.1rem;
}

.line.mid {
  width: 40%;
  height: 1rem;
}

.line.short {
  width: 65%;
}

.block {
  height: 7rem;
  margin-top: 6px;
}

@keyframes shimmer {
  from {
    background-position: 100% 50%;
  }

  to {
    background-position: 0 50%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bar,
  .cover {
    background: var(--color-surface-muted);
    animation: none;
  }
}

@media (max-width: 1199px) {
  .layout {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .rail {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 899px) {
  .book-detail-skeleton {
    padding-top: 20px;
  }

  .hero {
    gap: var(--space-4);
  }

  .send-bar {
    margin-top: 0;
  }

  .layout {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-8);
  }

  .rail {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
