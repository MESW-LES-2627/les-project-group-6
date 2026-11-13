<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import { addBookToFolder, removeBookFromFolder, updateReadingStatus } from '@/services/api';
import type { BookDetail, FolderSummary, LibraryBook, ReadingStatus } from '@/types/library';
import { progressPercent, readingStatusLabels } from '@/utils/library';

const props = defineProps<{
  book: LibraryBook;
  detail: BookDetail;
  folders: FolderSummary[];
  tags: string[];
}>();

const emit = defineEmits<{
  updated: [data: { status: ReadingStatus; currentPage: number }];
  foldersUpdated: [folderIds: string[]];
}>();

const isEditing = ref(false);
const selectedStatus = ref<ReadingStatus>(
  props.book.status === 'not-started' ? 'in-progress' : props.book.status,
);
const selectedPage = ref<number>(props.book.currentPage || 10);
const isSaving = ref(false);
const message = ref<string | null>(null);

const isEditingFolders = ref(false);
const selectedFolderIds = ref<string[]>([...props.book.folderIds]);
const isSavingFolders = ref(false);
const folderMessage = ref<string | null>(null);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isApiId = (value: string) => UUID_PATTERN.test(value);

watch(
  () => props.book,
  (newBook) => {
    selectedStatus.value = newBook.status === 'not-started' ? 'in-progress' : newBook.status;
    selectedPage.value = newBook.currentPage || 10;
    selectedFolderIds.value = [...newBook.folderIds];
  },
  { deep: true },
);

function toggleEdit() {
  isEditing.value = !isEditing.value;
  message.value = null;
  if (isEditing.value) {
    if (props.book.status === 'not-started') {
      selectedStatus.value = 'in-progress';
    } else {
      selectedStatus.value = props.book.status;
    }
    selectedPage.value = props.book.currentPage || 10;
  }
}

async function saveStatus() {
  isSaving.value = true;
  message.value = null;
  try {
    await updateReadingStatus({
      bookId: props.book.id,
      status: selectedStatus.value,
      currentPage: selectedPage.value,
    });
    emit('updated', {
      status: selectedStatus.value,
      currentPage: selectedPage.value,
    });
    message.value = 'Status saved to backend!';
    setTimeout(() => {
      isEditing.value = false;
      message.value = null;
    }, 1500);
  } catch (err: unknown) {
    message.value = err instanceof Error ? err.message : 'Failed to update';
  } finally {
    isSaving.value = false;
  }
}

const statusLabel = computed(() => readingStatusLabels[props.book.status]);
const percent = computed(() => progressPercent(props.book));
const folderLabel = computed(
  () =>
    props.folders
      .filter((folder) => selectedFolderIds.value.includes(folder.id))
      .map((folder) => folder.name)
      .join(' • ') || 'No folder yet',
);
const tagLabel = computed(() => props.tags.join(' • ') || 'No tags');

async function toggleFolder(folderId: string) {
  if (isSavingFolders.value) return;

  const previous = [...selectedFolderIds.value];
  const wasInFolder = previous.includes(folderId);
  selectedFolderIds.value = wasInFolder
    ? previous.filter((id) => id !== folderId)
    : [...previous, folderId];
  folderMessage.value = null;
  isSavingFolders.value = true;

  try {
    // Mock ids are client-only.
    if (isApiId(folderId) && isApiId(props.book.id)) {
      if (wasInFolder) {
        await removeBookFromFolder(folderId, props.book.id);
      } else {
        await addBookToFolder(folderId, props.book.id);
      }
    }
    emit('foldersUpdated', [...selectedFolderIds.value]);
  } catch (error) {
    selectedFolderIds.value = previous;
    folderMessage.value = error instanceof Error ? error.message : 'Failed to update folders';
  } finally {
    isSavingFolders.value = false;
  }
}
</script>

<template>
  <section class="reading-panel" aria-labelledby="reading-title">
    <h2 id="reading-title" class="panel-title">Your reading</h2>

    <div class="status-row">
      <span :class="['status-badge', `status-badge--${book.status}`]">
        {{ statusLabel.toUpperCase() }}
      </span>
      <span class="read-through">{{ detail.readThroughLabel }}</span>
    </div>

    <progress
      class="progress-bar detail-progress"
      :max="book.pages"
      :value="book.currentPage"
      :aria-label="`Progress in ${book.title}: ${percent}%`"
    ></progress>
    <p class="progress-label">
      Page {{ book.currentPage }} of {{ book.pages }} • {{ percent }}% complete
    </p>

    <div class="actions">
      <RouterLink
        class="start-session"
        :to="{ name: 'active-session', params: { bookId: book.id } }"
      >
        <svg width="11" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          <path d="M2 1.4v9.2c0 .5.5.8.9.5l7-4.6a.6.6 0 0 0 0-1L2.9.9a.6.6 0 0 0-.9.5Z" />
        </svg>
        Start session
      </RouterLink>
      <button type="button" class="update-status" @click="toggleEdit">
        {{ isEditing ? 'Close' : 'Update status' }} <span aria-hidden="true">•</span>
      </button>
    </div>

    <form v-if="isEditing" class="status-editor" @submit.prevent="saveStatus">
      <div class="editor-fields">
        <label class="editor-field">
          <span class="field-label">Status</span>
          <select v-model="selectedStatus" class="editor-select">
            <option value="not-started">Not started</option>
            <option value="in-progress">In progress (Reading)</option>
            <option value="finished">Finished</option>
            <option value="did-not-finish">Did not finish</option>
          </select>
        </label>

        <label class="editor-field">
          <span class="field-label">Current page</span>
          <input
            v-model.number="selectedPage"
            type="number"
            min="0"
            :max="book.pages"
            class="editor-input"
          />
        </label>
      </div>

      <div class="editor-buttons">
        <button type="submit" class="button-save" :disabled="isSaving">
          {{ isSaving ? 'Saving...' : 'Save status' }}
        </button>
        <button type="button" class="button-cancel" @click="isEditing = false">Cancel</button>
      </div>

      <p v-if="message" class="editor-message">{{ message }}</p>
    </form>

    <div class="meta-grid">
      <div class="meta-block">
        <p class="meta-label">Folders <span>• choose multiple</span></p>
        <button
          type="button"
          class="meta-value folder-toggle"
          :aria-expanded="isEditingFolders"
          @click="isEditingFolders = !isEditingFolders"
        >
          {{ folderLabel }}
        </button>
        <div v-if="isEditingFolders" class="folder-options">
          <label v-for="folder in folders" :key="folder.id" class="folder-option">
            <input
              type="checkbox"
              :checked="selectedFolderIds.includes(folder.id)"
              :disabled="isSavingFolders"
              @change="toggleFolder(folder.id)"
            />
            <span>{{ folder.name }}</span>
          </label>
          <p v-if="folders.length === 0" class="folder-empty">
            No folders yet. Create one in your library.
          </p>
          <p v-if="folderMessage" class="folder-message" role="alert">{{ folderMessage }}</p>
        </div>
      </div>
      <div class="meta-block">
        <p class="meta-label">Tags</p>
        <div class="meta-value">{{ tagLabel }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.reading-panel {
  min-width: 0;
  padding: 19px 20px 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.panel-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: var(--font-weight-normal);
  letter-spacing: -0.01em;
  line-height: 1.25;
}

.status-row {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-top: 11px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 21px;
  padding: 0 8px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  font-size: 0.625rem;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.055em;
  line-height: 1;
}

.status-badge--in-progress {
  background: var(--color-cream);
  color: var(--color-primary);
}

.status-badge--finished {
  background: var(--color-cream);
}

.read-through {
  color: var(--color-text-muted);
  font-size: 0.625rem;
}

.detail-progress {
  height: 4px;
  margin-top: 18px;
  border-radius: 2px;
}

.detail-progress::-webkit-progress-bar,
.detail-progress::-webkit-progress-value,
.detail-progress::-moz-progress-bar {
  border-radius: 2px;
}

.progress-label {
  margin: 17px 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  line-height: 1.35;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: center;
  margin-top: 16px;
}

.start-session {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 17px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
  cursor: pointer;
  transition: background-color var(--duration-fast);
}

.start-session:hover {
  background: var(--color-primary-hover);
}

.update-status {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.update-status:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.status-editor {
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editor-fields {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.editor-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.field-label {
  font-weight: var(--font-weight-medium);
}

.editor-select,
.editor-input {
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: #ffffff;
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-sm);
}

.editor-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.button-save {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  border-radius: var(--radius-control);
  padding: 6px 14px;
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}

.button-save:hover {
  background: var(--color-primary-hover);
}

.button-cancel {
  background: transparent;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  padding: 6px 12px;
  font: inherit;
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.editor-message {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-copper);
  font-weight: var(--font-weight-medium);
}

.meta-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px;
  gap: 20px;
  margin-top: 16px;
}

.meta-block {
  min-width: 0;
}

.meta-label {
  margin: 0 0 10px;
  color: var(--color-text-muted);
  font-size: 0.625rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.2;
}

.meta-label span {
  font-weight: var(--font-weight-normal);
}

.meta-value {
  display: flex;
  align-items: center;
  min-height: 34px;
  padding: 7px 12px;
  overflow: hidden;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  font-size: var(--font-size-xs);
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-toggle {
  width: 100%;
  border: 1px solid transparent;
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-xs);
  text-align: left;
  cursor: pointer;
}

.folder-toggle:hover {
  border-color: var(--color-border);
}

.folder-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
}

.folder-option {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.folder-option input {
  accent-color: var(--color-primary);
}

.folder-empty,
.folder-message {
  margin: 0;
  font-size: var(--font-size-xs);
}

.folder-empty {
  color: var(--color-text-muted);
}

.folder-message {
  color: var(--color-copper);
  font-weight: var(--font-weight-medium);
}

@media (max-width: 639px) {
  .reading-panel {
    padding: 18px 16px;
  }

  .meta-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 13px;
  }

  .meta-value {
    white-space: normal;
  }
}
</style>
