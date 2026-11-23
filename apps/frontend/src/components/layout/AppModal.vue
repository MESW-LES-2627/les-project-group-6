<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

// A small modal dialog: it closes on Escape or a click on the backdrop, keeps Tab
// inside the dialog while it is open, and gives the page back when it unmounts.
defineProps<{ labelledBy: string }>();
const emit = defineEmits<{ close: [] }>();

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const dialog = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;
let previousOverflow = '';

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('close');
    return;
  }
  if (event.key !== 'Tab' || !dialog.value) return;

  const focusable = Array.from(dialog.value.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (focusable.length === 0) return;
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function closeOnBackdrop(event: MouseEvent) {
  if (event.target === event.currentTarget) emit('close');
}

onMounted(() => {
  previouslyFocused = document.activeElement as HTMLElement | null;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  // Start on the first field so the reader can type straight away.
  const target = dialog.value?.querySelector<HTMLElement>('input, textarea, select');
  (target ?? dialog.value)?.focus();
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = previousOverflow;
  previouslyFocused?.focus();
});
</script>

<template>
  <div class="modal-backdrop" @click="closeOnBackdrop">
    <div
      ref="dialog"
      class="modal-dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="labelledBy"
      tabindex="-1"
    >
      <button type="button" class="modal-close" aria-label="Close" @click="emit('close')">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgb(67 40 24 / 45%);
}

.modal-dialog {
  position: relative;
  width: min(32rem, 100%);
  max-height: calc(100vh - 2 * var(--space-4));
  overflow-y: auto;
  padding: var(--space-8) var(--space-6) var(--space-6);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-menu);
}

.modal-close {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.modal-close:hover {
  background: var(--color-surface-hover);
  color: var(--color-primary);
}

@media (max-width: 599px) {
  .modal-dialog {
    padding: var(--space-6) var(--space-4) var(--space-4);
  }
}
</style>
