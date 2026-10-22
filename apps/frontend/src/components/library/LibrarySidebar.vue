<script setup lang="ts">
import type { FolderSummary, Shelf, ShelfId, TagSummary } from '@/types/library';

defineProps<{
  shelves: Shelf[];
  folders: FolderSummary[];
  tags: TagSummary[];
  activeShelf: ShelfId;
  activeFolder: string | null;
  activeTag: string | null;
}>();

defineEmits<{
  selectShelf: [id: ShelfId];
  selectFolder: [id: string];
  selectTag: [id: string];
  createFolder: [];
  manageFolders: [];
  manageTags: [];
}>();
</script>

<template>
  <aside class="shelves" aria-label="Your shelves">
    <div class="panel">
      <h2 class="panel-title">Your shelves</h2>

      <ul class="shelf-list">
        <li v-for="shelf in shelves" :key="shelf.id" :class="{ separate: shelf.id === 'all' }">
          <button
            type="button"
            :class="['row', { active: activeShelf === shelf.id }]"
            :aria-pressed="activeShelf === shelf.id"
            @click="$emit('selectShelf', shelf.id)"
          >
            <span>{{ shelf.label }}</span>
            <span class="dot" aria-hidden="true">•</span>
            <span>{{ shelf.count }}</span>
          </button>
        </li>
      </ul>

      <h3 class="group-title folders-title">Folders</h3>
      <ul class="folder-list">
        <li v-for="folder in folders" :key="folder.id">
          <button
            type="button"
            :class="['row', { active: activeFolder === folder.id }]"
            :aria-pressed="activeFolder === folder.id"
            @click="$emit('selectFolder', folder.id)"
          >
            <span>{{ folder.name }}</span>
            <span class="dot" aria-hidden="true">•</span>
            <span>{{ folder.count }}</span>
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
        Create folder
      </button>
      <button type="button" class="manage" @click="$emit('manageFolders')">
        Manage folders <span aria-hidden="true">→</span>
      </button>

      <h3 class="group-title tags-title">Tags</h3>
      <ul class="tag-list">
        <li v-for="tag in tags" :key="tag.id">
          <button
            type="button"
            :class="['tag', { active: activeTag === tag.id }]"
            :aria-pressed="activeTag === tag.id"
            @click="$emit('selectTag', tag.id)"
          >
            {{ tag.name }} <span aria-hidden="true">•</span> {{ tag.count }}
          </button>
        </li>
      </ul>
      <button type="button" class="manage tags-manage" @click="$emit('manageTags')">
        Manage tags <span aria-hidden="true">→</span>
      </button>
    </div>

    <div class="tip">
      <svg
        class="tip-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M9 7.5h6V17l-3-2-3 2z" />
      </svg>
      <div>
        <p class="tip-title">Shelves, not duplicates</p>
        <p class="tip-body">
          Books can live in multiple folders. Deleting a folder never deletes its books.
        </p>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.shelves {
  min-width: 0;
}

.panel {
  padding: 22px 20px 17px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.panel-title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  line-height: 1.2;
}

.shelf-list,
.folder-list,
.tag-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.shelf-list {
  margin-top: 18px;
}

.shelf-list .separate {
  margin-bottom: 32px;
}

.row {
  display: flex;
  gap: 5px;
  align-items: baseline;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-sm);
  line-height: 1.45;
  text-align: left;
  cursor: pointer;
}

.row + .row,
li + li > .row {
  margin-top: 11px;
}

.row:hover,
.row.active {
  color: var(--color-primary);
}

.row.active {
  font-weight: var(--font-weight-semibold);
}

.dot {
  color: var(--color-text-muted);
}

.group-title {
  margin: 0;
  color: var(--color-text-muted);
  font-family: var(--font-body);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.02em;
}

.folders-title {
  margin-top: 38px;
}

.folder-list {
  margin-top: 15px;
}

.folder-list .row {
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.add-folder {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 22px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.add-folder:hover,
.manage:hover {
  color: var(--color-primary);
}

.manage {
  display: block;
  margin-top: 15px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.tags-title {
  margin-top: 32px;
}

.tag-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-top: 15px;
}

.tag {
  padding: 3px 9px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-2xs);
  line-height: 1.2;
  cursor: pointer;
}

.tag:hover {
  background: var(--color-surface-hover);
}

.tag.active {
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
}

.tags-manage {
  margin-top: 15px;
}

.tip {
  display: flex;
  gap: 6px;
  margin-top: 18px;
  padding: 14px 16px 13px 18px;
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.tip-icon {
  flex: none;
  margin-top: 2px;
  color: var(--color-copper);
}

.tip-title {
  margin: 0 0 1px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.tip-body {
  margin: 0;
  font-size: var(--font-size-2xs);
  line-height: 1.45;
}

@media (max-width: 899px) {
  .panel {
    padding: 20px 18px 18px;
  }

  .shelf-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
    margin-top: 16px;
  }

  .shelf-list .separate {
    margin-bottom: 0;
  }

  .row + .row,
  li + li > .row {
    margin-top: 0;
  }

  .folder-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
  }

  .folder-list li + li > .row {
    margin-top: 0;
  }

  .tip {
    max-width: 32rem;
  }
}
</style>
