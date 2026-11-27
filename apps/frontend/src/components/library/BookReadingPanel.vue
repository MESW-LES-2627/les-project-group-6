<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import {
  addBookToFolder,
  getActiveReadingSession,
  type ApiReadingSession,
  removeBookFromFolder,
  removeFromLibrary,
  tagBook,
  untagBook,
  updateReadingStatus,
} from '@/services/api';
import type { FolderSummary, LibraryBook, ReadingStatus, TagSummary } from '@/types/library';
import { toIsoDate } from '@/utils/groups';
import { progressPercent, readingStatusLabels } from '@/utils/library';

const props = defineProps<{
  book: LibraryBook;
  folders: FolderSummary[];
  /** All of the reader's tags, used to name the ids on this book. */
  tags: TagSummary[];
}>();

const activeSession = ref<ApiReadingSession | null>(null);
const sessionState = ref<'loading' | 'ready' | 'error'>('loading');
onMounted(async () => {
  try {
    activeSession.value = await getActiveReadingSession();
    sessionState.value = 'ready';
  } catch {
    sessionState.value = 'error';
  }
});

const emit = defineEmits<{
  updated: [
    data: {
      status: ReadingStatus;
      currentPage: number;
      startedOn?: string | null;
      finishedOn?: string | null;
    },
  ];
  /** The book was added to or removed from the library; the page reloads it. */
  libraryChanged: [];
  foldersUpdated: [folderIds: string[]];
  tagAdded: [tag: TagSummary];
  tagRemoved: [tagId: string];
}>();

const isEditing = ref(false);
const selectedStatus = ref<ReadingStatus>(
  props.book.status === 'not-started' ? 'in-progress' : props.book.status,
);
const selectedPage = ref<number>(props.book.currentPage || 10);
const isSaving = ref(false);
const message = ref<string | null>(null);
// F-LIB-01: the start and finish days, as YYYY-MM-DD ('' when not set).
const startedOn = ref(props.book.startedOn ?? '');
const finishedOn = ref(props.book.finishedOn ?? '');
const libraryBusy = ref(false);
const libraryMessage = ref<string | null>(null);

const dateError = computed(() =>
  selectedStatus.value === 'finished' &&
  startedOn.value &&
  finishedOn.value &&
  finishedOn.value < startedOn.value
    ? 'The finish date cannot be before the start date.'
    : null,
);

// Marking a book finished fills in today as the finish day, which the reader can edit.
watch(selectedStatus, (status) => {
  if (status === 'finished' && !finishedOn.value) finishedOn.value = toIsoDate(new Date());
});

function formatDay(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const datesLabel = computed(() => {
  const parts: string[] = [];
  if (props.book.startedOn) parts.push(`Started ${formatDay(props.book.startedOn)}`);
  if (props.book.finishedOn) parts.push(`Finished ${formatDay(props.book.finishedOn)}`);
  return parts.join(' • ');
});

async function addToLibrary() {
  libraryBusy.value = true;
  libraryMessage.value = null;
  try {
    await updateReadingStatus({ bookId: props.book.id, status: 'not-started', currentPage: 0 });
    emit('libraryChanged');
  } catch (err: unknown) {
    libraryMessage.value = err instanceof Error ? err.message : 'Failed to add the book';
  } finally {
    libraryBusy.value = false;
  }
}

async function remove() {
  if (!window.confirm(`Remove ${props.book.title} from your library?`)) return;
  libraryBusy.value = true;
  libraryMessage.value = null;
  try {
    await removeFromLibrary(props.book.id);
    isEditing.value = false;
    emit('libraryChanged');
  } catch (err: unknown) {
    libraryMessage.value = err instanceof Error ? err.message : 'Failed to remove the book';
  } finally {
    libraryBusy.value = false;
  }
}

const isEditingFolders = ref(false);
const selectedFolderIds = ref<string[]>([...props.book.folderIds]);
const isSavingFolders = ref(false);
const folderMessage = ref<string | null>(null);

const newTag = ref('');
const isSavingTags = ref(false);
const tagMessage = ref<string | null>(null);
const MAX_TAG_LENGTH = 40;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isApiId = (value: string) => UUID_PATTERN.test(value);

watch(
  () => props.book,
  (newBook) => {
    selectedStatus.value = newBook.status === 'not-started' ? 'in-progress' : newBook.status;
    selectedPage.value = newBook.currentPage || 10;
    selectedFolderIds.value = [...newBook.folderIds];
    startedOn.value = newBook.startedOn ?? '';
    finishedOn.value = newBook.finishedOn ?? '';
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
  if (dateError.value) return;
  isSaving.value = true;
  message.value = null;
  // Only the dates the reader edited are sent; the server fills in the others itself.
  const changed = (value: string, saved: string | null | undefined) =>
    value === (saved ?? '') ? undefined : value || null;
  const dates = {
    startedOn:
      selectedStatus.value === 'not-started'
        ? undefined
        : changed(startedOn.value, props.book.startedOn),
    finishedOn:
      selectedStatus.value === 'finished'
        ? changed(finishedOn.value, props.book.finishedOn)
        : undefined,
  };
  try {
    await updateReadingStatus({
      bookId: props.book.id,
      status: selectedStatus.value,
      currentPage: selectedPage.value,
      ...dates,
    });
    emit('updated', {
      status: selectedStatus.value,
      currentPage: selectedPage.value,
      ...dates,
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
const bookTags = computed(() =>
  props.book.tagIds
    .map((id) => props.tags.find((tag) => tag.id === id))
    .filter((tag): tag is TagSummary => tag !== undefined),
);

/** Same rule as the API: trimmed, single spaces, lower case. */
const normaliseTag = (raw: string) => raw.trim().replace(/\s+/g, ' ').toLowerCase();

async function addTag() {
  const name = normaliseTag(newTag.value);
  if (!name || isSavingTags.value) return;
  tagMessage.value = null;

  if (bookTags.value.some((tag) => tag.name === name)) {
    tagMessage.value = `This book already has the tag "${name}"`;
    return;
  }

  isSavingTags.value = true;
  try {
    // Mock books are client-only: reuse a known tag or make a local one.
    const tag = isApiId(props.book.id)
      ? await tagBook(props.book.id, name)
      : (props.tags.find((known) => known.name === name) ?? {
          id: `local-${Date.now()}`,
          name,
          count: 0,
        });
    emit('tagAdded', tag);
    newTag.value = '';
  } catch (error) {
    tagMessage.value = error instanceof Error ? error.message : 'Failed to add the tag';
  } finally {
    isSavingTags.value = false;
  }
}

async function removeTag(tagId: string) {
  if (isSavingTags.value) return;
  tagMessage.value = null;
  isSavingTags.value = true;
  try {
    if (isApiId(props.book.id) && isApiId(tagId)) await untagBook(props.book.id, tagId);
    emit('tagRemoved', tagId);
  } catch (error) {
    tagMessage.value = error instanceof Error ? error.message : 'Failed to remove the tag';
  } finally {
    isSavingTags.value = false;
  }
}

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
    <p v-if="datesLabel" class="progress-label reading-dates">{{ datesLabel }}</p>

    <div class="actions">
      <RouterLink
        v-if="sessionState === 'ready'"
        class="start-session"
        :to="{ name: 'active-session', params: { bookId: activeSession?.bookId ?? book.id } }"
      >
        <svg width="11" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          <path d="M2 1.4v9.2c0 .5.5.8.9.5l7-4.6a.6.6 0 0 0 0-1L2.9.9a.6.6 0 0 0-.9.5Z" />
        </svg>
        {{ activeSession ? 'Continue session' : 'Start session' }}
      </RouterLink>
      <button v-else class="start-session" type="button" disabled>
        {{ sessionState === 'loading' ? 'Checking session…' : 'Session unavailable' }}
      </button>
      <button
        v-if="book.inLibrary === false"
        type="button"
        class="update-status add-to-library"
        :disabled="libraryBusy"
        @click="addToLibrary"
      >
        Add to library <span aria-hidden="true">•</span>
      </button>
      <button v-else type="button" class="update-status" @click="toggleEdit">
        {{ isEditing ? 'Close' : 'Update status' }} <span aria-hidden="true">•</span>
      </button>
    </div>
    <p v-if="sessionState === 'error'" class="editor-message" role="alert">
      Could not check your reading session. Refresh the page to try again.
    </p>
    <p v-else-if="activeSession && activeSession.bookId !== book.id" class="editor-message">
      A session is already running for another book. Continue it before starting a new one.
    </p>
    <p v-if="libraryMessage" class="editor-message" role="alert">{{ libraryMessage }}</p>

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

        <label v-if="selectedStatus !== 'not-started'" class="editor-field">
          <span class="field-label">Started on</span>
          <input v-model="startedOn" type="date" class="editor-input started-on" />
        </label>

        <label v-if="selectedStatus === 'finished'" class="editor-field">
          <span class="field-label">Finished on</span>
          <input
            v-model="finishedOn"
            type="date"
            class="editor-input finished-on"
            :aria-invalid="dateError ? 'true' : undefined"
          />
        </label>
      </div>
      <p v-if="dateError" class="editor-message date-error" role="alert">{{ dateError }}</p>

      <div class="editor-buttons">
        <button type="submit" class="button-save" :disabled="isSaving || !!dateError">
          {{ isSaving ? 'Saving...' : 'Save status' }}
        </button>
        <button type="button" class="button-cancel" @click="isEditing = false">Cancel</button>
        <button
          type="button"
          class="button-cancel remove-from-library"
          :disabled="libraryBusy"
          @click="remove"
        >
          Remove from library
        </button>
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
        <p class="meta-label">Tags <span>• only you see them</span></p>
        <ul v-if="bookTags.length" class="tag-chips" aria-label="Tags on this book">
          <li v-for="tag in bookTags" :key="tag.id" class="tag-chip">
            {{ tag.name }}
            <button
              type="button"
              class="tag-remove"
              :aria-label="`Remove tag ${tag.name}`"
              :disabled="isSavingTags"
              @click="removeTag(tag.id)"
            >
              <span aria-hidden="true">×</span>
            </button>
          </li>
        </ul>
        <p v-else class="tag-empty">No tags</p>
        <form class="tag-form" @submit.prevent="addTag">
          <input
            v-model="newTag"
            class="tag-input"
            type="text"
            list="known-tags"
            :maxlength="MAX_TAG_LENGTH"
            placeholder="borrowed, audiobook…"
            aria-label="New tag"
          />
          <datalist id="known-tags">
            <option v-for="tag in tags" :key="tag.id" :value="tag.name" />
          </datalist>
          <button type="submit" class="tag-add" :disabled="isSavingTags || !newTag.trim()">
            Add tag
          </button>
        </form>
        <p v-if="tagMessage" class="tag-message" role="alert">{{ tagMessage }}</p>
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

.start-session:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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

.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 8px;
  padding: 0;
  list-style: none;
}

.tag-chip {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 2px 4px 2px 10px;
  border-radius: 999px;
  background: var(--color-cream);
  color: var(--color-text);
  font-size: var(--font-size-xs);
}

.tag-remove {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  line-height: 1;
  cursor: pointer;
}

.tag-remove:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.tag-empty {
  margin: 0 0 8px;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.tag-form {
  display: flex;
  gap: 6px;
}

.tag-input {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: #ffffff;
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-xs);
}

.tag-add {
  padding: 6px 12px;
  border: none;
  border-radius: var(--radius-control);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}

.tag-add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tag-message {
  margin: 6px 0 0;
  color: var(--color-copper);
  font-size: var(--font-size-xs);
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
