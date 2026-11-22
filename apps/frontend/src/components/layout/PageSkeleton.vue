<script setup lang="ts">
import AppSkeleton from '@/components/layout/AppSkeleton.vue';

// The one loading placeholder for a whole page or page section. Pick the variant that
// matches the shape of the page that is loading instead of writing a new skeleton:
//
//   detail   a title, a main column and an optional cover column and side rail;
//            `plate` adds the burgundy band used by group pages
//            (book page, group page, reading room)
//   profile  an identity band over a two-column body (own and other readers' profiles)
//   cards    a grid of cards, with an optional filter sidebar (library, Explore)
//   list     titled sections of short rows (groups)
//   rows     one plain vertical list of short rows (home sections)
//
// It announces `label` once with `role="status"`; the shimmering blocks are hidden from
// screen readers. Colours and radii come from the design tokens, so nothing here is
// page-specific.
withDefaults(
  defineProps<{
    /** What is loading, announced to screen readers, e.g. `Loading the book…`. */
    label: string;
    variant?: 'detail' | 'profile' | 'cards' | 'list' | 'rows';
    /** `detail`: a left column with a cover and two buttons. */
    cover?: boolean;
    /** `detail`: a side rail on the right. */
    rail?: boolean;
    /** `detail`: the burgundy page plate above the content (group pages). */
    plate?: boolean;
    /** `cards`: the cover above the text (`column`) or beside it (`row`). */
    card?: 'column' | 'row';
    /** `cards`: how many cards. `list`: how many rows in each section. `rows`: how many rows. */
    count?: number;
    /** `cards`: a filter list on the left. */
    sidebar?: boolean;
    /** `list`: how many titled sections. */
    sections?: number;
  }>(),
  {
    variant: 'detail',
    cover: false,
    rail: true,
    plate: false,
    card: 'column',
    count: 4,
    sidebar: false,
    sections: 2,
  },
);
</script>

<template>
  <div :class="['page-skeleton', variant]" role="status" aria-busy="true">
    <span class="sr-only">{{ label }}</span>

    <template v-if="variant === 'profile'">
      <div class="band" aria-hidden="true">
        <div class="plate">
          <div class="identity">
            <AppSkeleton circle width="120px" height="120px" />
            <div class="stack tight">
              <AppSkeleton width="14rem" height="1.75rem" />
              <AppSkeleton width="10rem" height="0.875rem" />
              <AppSkeleton width="18rem" height="0.875rem" />
            </div>
          </div>
          <AppSkeleton width="7rem" height="2.25rem" radius="var(--radius-control)" />
        </div>
      </div>

      <div class="page-column profile-body" aria-hidden="true">
        <AppSkeleton width="12rem" height="1.5rem" />
        <AppSkeleton height="8rem" radius="var(--radius-md)" />
        <div class="profile-columns">
          <div class="stack">
            <AppSkeleton height="8rem" />
            <AppSkeleton height="11rem" />
          </div>
          <div class="stack">
            <AppSkeleton height="6rem" />
            <AppSkeleton height="9rem" />
            <AppSkeleton height="5rem" />
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="variant === 'detail'">
      <div v-if="plate" class="band" aria-hidden="true">
        <div class="plate">
          <div class="stack tight">
            <AppSkeleton width="18rem" height="2.25rem" />
            <AppSkeleton width="11rem" height="0.875rem" />
            <AppSkeleton width="22rem" height="0.875rem" />
          </div>
          <AppSkeleton width="8rem" height="2.25rem" radius="var(--radius-control)" />
        </div>
      </div>

      <div :class="['detail-body', { 'page-column': plate }]" aria-hidden="true">
        <template v-if="!plate">
          <AppSkeleton width="10rem" height="0.75rem" />
          <AppSkeleton class="title" width="55%" height="2.5rem" />
          <AppSkeleton width="40%" height="1rem" />
        </template>

        <div :class="['detail-layout', { 'has-cover': cover, 'has-rail': rail }]">
          <div v-if="cover" class="stack tight">
            <div class="cover"><AppSkeleton height="100%" radius="var(--radius-cover)" /></div>
            <AppSkeleton height="2.5rem" radius="var(--radius-control)" />
            <AppSkeleton height="2.5rem" radius="var(--radius-control)" />
          </div>

          <div class="stack tight">
            <AppSkeleton height="8rem" radius="var(--radius-md)" />
            <AppSkeleton height="6rem" radius="var(--radius-md)" />
            <AppSkeleton height="10rem" radius="var(--radius-md)" />
          </div>

          <div v-if="rail" class="stack tight rail">
            <AppSkeleton height="11rem" radius="var(--radius-md)" />
            <AppSkeleton height="7rem" radius="var(--radius-md)" />
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="variant === 'cards'" :class="['cards-layout', { 'has-sidebar': sidebar }]">
      <aside v-if="sidebar" class="filters" aria-hidden="true">
        <AppSkeleton width="70%" height="0.875rem" />
        <div class="stack tight">
          <AppSkeleton
            v-for="n in 4"
            :key="`group-${n}`"
            :width="`${88 - n * 9}%`"
            height="0.875rem"
          />
        </div>
        <AppSkeleton width="55%" height="0.875rem" />
        <div class="stack tight">
          <AppSkeleton
            v-for="n in 3"
            :key="`tag-${n}`"
            :width="`${78 - n * 8}%`"
            height="0.875rem"
          />
        </div>
      </aside>

      <section class="results" aria-hidden="true">
        <AppSkeleton v-if="sidebar" width="9rem" height="1.5rem" />
        <div :class="['grid', card]">
          <div v-for="n in count" :key="n" :class="['card', card]">
            <div class="cover"><AppSkeleton height="100%" radius="var(--radius-cover)" /></div>
            <div class="stack tight card-body">
              <AppSkeleton width="85%" :height="card === 'row' ? '1.25rem' : '0.875rem'" />
              <AppSkeleton width="55%" height="0.75rem" />
              <AppSkeleton
                v-if="card === 'row'"
                width="6rem"
                height="2rem"
                radius="var(--radius-control)"
              />
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-else-if="variant === 'rows'" class="rows" aria-hidden="true">
      <div v-for="n in count" :key="n" class="list-row">
        <div class="thumb"><AppSkeleton height="100%" radius="var(--radius-cover)" /></div>
        <div class="stack tight list-row-body">
          <AppSkeleton width="65%" height="1.25rem" />
          <AppSkeleton width="45%" height="0.75rem" />
          <AppSkeleton width="35%" height="0.5rem" />
        </div>
      </div>
    </div>

    <div v-else aria-hidden="true">
      <section v-for="s in sections" :key="s" class="list-section">
        <AppSkeleton :width="s === 1 ? '5rem' : '6rem'" height="1.5rem" />
        <div class="list-rows">
          <div v-for="n in count" :key="n" class="list-row">
            <div class="thumb"><AppSkeleton height="100%" radius="var(--radius-cover)" /></div>
            <div class="stack tight list-row-body">
              <AppSkeleton width="65%" height="1.25rem" />
              <AppSkeleton width="45%" height="0.75rem" />
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* The whole placeholder eases in instead of appearing in one frame. */
.page-skeleton {
  animation: page-skeleton-in 260ms var(--ease-out) both;
}

@keyframes page-skeleton-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-skeleton {
    animation: none;
  }
}

/* Fixed widths shrink on narrow screens instead of pushing the page sideways. */
.page-skeleton :deep(.skeleton) {
  max-width: 100%;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  min-width: 0;
}

.stack.tight {
  gap: var(--space-3);
}

/* Cover-shaped box: the skeleton inside fills it. */
.cover {
  flex: none;
  aspect-ratio: 2 / 3;
}

/* detail */
.title {
  margin: var(--space-2) 0 var(--space-3);
}

/* With a plate the page column sits below the full-width band. */
.detail-body.page-column {
  padding-top: var(--space-10);
}

.detail-body.page-column .detail-layout {
  margin-top: 0;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-8);
  align-items: start;
  margin-top: var(--space-6);
}

.detail-layout.has-rail {
  grid-template-columns: minmax(0, 1fr) 340px;
}

.detail-layout.has-cover {
  grid-template-columns: 220px minmax(0, 1fr);
}

.detail-layout.has-cover.has-rail {
  grid-template-columns: 247px minmax(0, 1fr) 309px;
}

/* profile */
.band {
  padding: 14px;
  background: var(--color-primary);
}

.plate {
  display: flex;
  gap: var(--space-10);
  align-items: center;
  justify-content: space-between;
  max-width: 77.25rem;
  min-height: 192px;
  margin: 0 auto;
  padding: 0 34px;
  border: 1px solid rgb(255 230 167 / 25%);
}

.identity {
  display: flex;
  gap: var(--space-8);
  align-items: center;
  min-width: 0;
}

.profile-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding-top: var(--space-8);
}

.profile-columns {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  column-gap: 64px;
}

/* cards */
.cards-layout.has-sidebar {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 56px;
}

.filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding-top: var(--space-8);
}

.results {
  min-width: 0;
}

.has-sidebar .results {
  padding: var(--space-8) 0 var(--space-12);
}

.grid {
  display: grid;
  gap: 36px var(--space-6);
}

.has-sidebar .grid {
  margin-top: 28px;
}

.grid.column {
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
}

.grid.row {
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: var(--space-4);
}

.card {
  min-width: 0;
}

.card-body {
  flex: 1;
}

.card.column {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.card.row {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.card.row .cover {
  width: 96px;
}

/* rows */
.rows {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* list */
.list-section {
  padding: var(--space-10) 0 var(--space-10);
}

.list-section + .list-section {
  border-top: 1px solid var(--color-border);
}

.list-rows {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-6) var(--space-14);
  margin-top: 22px;
}

.list-row {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  min-width: 0;
}

.thumb {
  flex: none;
  width: 2.5rem;
  height: 3.5rem;
}

.list-row-body {
  flex: 1;
}

@media (max-width: 899px) {
  .detail-layout.has-rail,
  .detail-layout.has-cover,
  .detail-layout.has-cover.has-rail {
    grid-template-columns: minmax(0, 1fr);
  }

  .detail-layout.has-cover > :first-child {
    max-width: 200px;
  }

  .rail {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .plate {
    flex-direction: column;
    gap: var(--space-4);
    align-items: stretch;
    padding: 24px 16px;
  }

  .profile-columns {
    grid-template-columns: minmax(0, 1fr);
    row-gap: var(--space-6);
  }

  .cards-layout.has-sidebar {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-8);
  }

  .has-sidebar .results {
    order: -1;
  }

  .filters {
    padding-top: 0;
  }

  .list-rows {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
