<script setup lang="ts">
import { ref } from 'vue';

import type { FolderSummary, TagSummary } from '@/types/library';

defineProps<{
  folders: FolderSummary[];
  tags: TagSummary[];
  activeFolder: string | null;
  activeTag: string | null;
  /** Shown under the folder list, e.g. the exact duplicate-name message. */
  error?: string | null;
}>();

const emit = defineEmits<{
  selectFolder: [id: string];
  selectTag: [id: string];
  createFolder: [name: string];
  renameFolder: [id: string, name: string];
  deleteFolder: [id: string];
}>();

const isCreating = ref(false);
const newName = ref('');
const editingId = ref<string | null>(null);
const editName = ref('');

function startCreate() {
  isCreating.value = true;
  editingId.value = null;
  newName.value = '';
}

function cancelCreate() {
  isCreating.value = false;
  newName.value = '';
}

function submitCreate() {
  const name = newName.value.trim();
  if (!name) return;
  emit('createFolder', name);
  isCreating.value = false;
  newName.value = '';
}

function startRename(folder: FolderSummary) {
  editingId.value = folder.id;
  editName.value = folder.name;
  isCreating.value = false;
}

function cancelRename() {
  editingId.value = null;
  editName.value = '';
}

function submitRename() {
  const name = editName.value.trim();
  if (!name || !editingId.value) return;
  emit('renameFolder', editingId.value, name);
  editingId.value = null;
  editName.value = '';
}
</script>

<template>
  <aside class="shelves" aria-label="Folders and tags">
    <section class="group" aria-labelledby="folders-title">
      <h2 id="folders-title" class="section-title">Folders</h2>
      <ul class="folder-list">
        <li v-for="folder in folders" :key="folder.id" class="folder-item">
          <form v-if="editingId === folder.id" class="folder-form" @submit.prevent="submitRename">
            <input
              v-model="editName"
              class="folder-input"
              type="text"
              maxlength="100"
              :aria-label="`Rename ${folder.name}`"
            />
            <button type="submit" class="folder-action">Save</button>
            <button type="button" class="folder-action" @click="cancelRename">Cancel</button>
          </form>
          <template v-else>
            <button
              type="button"
              :class="['row', { active: activeFolder === folder.id }]"
              :aria-pressed="activeFolder === folder.id"
              @click="$emit('selectFolder', folder.id)"
            >
              <span class="folder-name">{{ folder.name }}</span>
              <span class="count">{{ folder.count }}</span>
            </button>
            <span class="folder-actions">
              <button
                type="button"
                class="icon-button"
                :aria-label="`Rename ${folder.name}`"
                title="Rename folder"
                @click="startRename(folder)"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <button
                type="button"
                class="icon-button"
                :aria-label="`Delete ${folder.name}`"
                title="Delete folder"
                @click="$emit('deleteFolder', folder.id)"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                </svg>
              </button>
            </span>
          </template>
        </li>
      </ul>
      <form v-if="isCreating" class="folder-form create-form" @submit.prevent="submitCreate">
        <input
          v-model="newName"
          class="folder-input"
          type="text"
          maxlength="100"
          placeholder="Folder name"
          aria-label="Folder name"
        />
        <button type="submit" class="folder-action">Create</button>
        <button type="button" class="folder-action" @click="cancelCreate">Cancel</button>
      </form>
      <button v-else type="button" class="add-folder" @click="startCreate">
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
      <p v-if="error" class="folder-error" role="alert">{{ error }}</p>
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
      <p v-if="tags.length === 0" class="tag-empty">No tags yet. Add them from a book's page.</p>
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
.tag-empty {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

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

.folder-item {
  display: flex;
  gap: 4px;
  align-items: center;
}

.folder-item .row {
  flex: 1;
  min-width: 0;
}

.folder-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-actions {
  display: inline-flex;
  flex: none;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--duration-fast);
}

.folder-item:hover .folder-actions,
.folder-item:focus-within .folder-actions {
  opacity: 1;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.icon-button:hover {
  background: var(--color-surface-muted);
  color: var(--color-primary);
}

.folder-form {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: var(--space-2);
}

.create-form {
  margin-top: var(--space-3);
}

.folder-input {
  flex: 1;
  min-width: 0;
  padding: 5px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-sm);
}

.folder-action {
  padding: 5px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.folder-action[type='submit'] {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
}

.folder-error {
  margin: var(--space-2) 0 0;
  color: var(--color-copper);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
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

  .folder-actions {
    opacity: 1;
  }
}
</style>
