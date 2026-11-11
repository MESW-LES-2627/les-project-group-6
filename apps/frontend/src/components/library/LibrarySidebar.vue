<script setup lang="ts">
import type { FolderSummary, TagSummary } from '@/types/library';

defineProps<{
  folders: FolderSummary[];
  tags: TagSummary[];
  activeFolder: string | null;
  activeTag: string | null;
}>();

defineEmits<{
  selectFolder: [id: string];
  selectTag: [id: string];
  createFolder: [];
}>();
</script>

<template>
  <aside class="shelves" aria-label="Folders and tags">
    <section class="group" aria-labelledby="folders-title">
      <h2 id="folders-title" class="section-title">Folders</h2>
      <ul class="folder-list">
        <li v-for="folder in folders" :key="folder.id">
          <button
            type="button"
            :class="['row', { active: activeFolder === folder.id }]"
            :aria-pressed="activeFolder === folder.id"
            @click="$emit('selectFolder', folder.id)"
          >
            <span>{{ folder.name }}</span>
            <span class="count">{{ folder.count }}</span>
          </button>
        </li>
      </ul>
      <button type="button" class="add-folder" @click="$emit('createFolder')">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        New folder
      </button>
    </section>

    <section class="group" aria-labelledby="tags-title">
      <h2 id="tags-title" class="section-title">Tags</h2>
      <ul class="tag-list">
        <li v-for="tag in tags" :key="tag.id">
          <button
            type="button"
            :class="['tag', { active: activeTag === tag.id }]"
            :aria-pressed="activeTag === tag.id"
            @click="$emit('selectTag', tag.id)"
          >
            {{ tag.name }} <span aria-hidden="true">·</span> {{ tag.count }}
          </button>
        </li>
      </ul>
    </section>
  </aside>
</template>

<style scoped>
.shelves {
  min-width: 0;
}

.group {
  padding: var(--space-8) 0 28px;
}

.group + .group {
  padding-top: 28px;
  border-top: 1px solid var(--color-border);
}

.section-title {
  margin-bottom: var(--space-4);
}

.folder-list,
.tag-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 6px 0;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  text-align: left;
  cursor: pointer;
}

.row:hover,
.row.active {
  color: var(--color-primary);
}

.row.active {
  font-weight: 600;
}

.count {
  color: var(--color-text-muted);
}

.row.active .count {
  color: inherit;
}

.add-folder {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  min-height: 36px;
  margin-top: var(--space-2);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
}

.add-folder:hover {
  color: var(--color-primary-hover);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tag {
  padding: var(--space-1) 10px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: var(--font-size-xs);
  font-weight: 400;
  cursor: pointer;
}

.tag:hover {
  background: var(--color-surface-hover);
}

.tag.active {
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
}

@media (max-width: 899px) {
  .group {
    padding: var(--space-6) 0;
  }

  .folder-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0 var(--space-6);
  }

  .row {
    gap: var(--space-2);
    width: auto;
  }
}
</style>
