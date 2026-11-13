<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

// A small accessible modal shell: fixed backdrop, a labelled dialog, Escape and
// backdrop clicks to close, focus moved inside and returned on unmount, and the
// page behind locked while it is open.
defineProps<{ labelledby: string }>();
const emit = defineEmits<{ close: [] }>();

const dialog = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;
let previousOverflow = '';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(): HTMLElement[] {
  return Array.from(dialog.value?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('close');
    return;
  }
  if (event.key !== 'Tab') return;

  // Keep Tab inside the dialog so the page behind stays out of reach.
  const items = focusables();
  if (items.length === 0) return;
  const first = items[0]!;
  const last = items[items.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(() => {
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKeydown);

  const target = dialog.value?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0];
  target?.focus();
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = previousOverflow;
  if (previouslyFocused?.isConnected) previouslyFocused.focus();
});
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <div ref="dialog" class="dialog" role="dialog" aria-modal="true" :aria-labelledby="labelledby">
      <header class="head">
        <slot name="header" />
        <button type="button" class="close" aria-label="Close" @click="emit('close')">
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
      </header>
      <div class="body">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgb(67 40 24 / 45%);
}

.dialog {
  display: flex;
  flex-direction: column;
  width: min(42rem, 100%);
  max-height: min(88vh, 46rem);
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  box-shadow: var(--shadow-menu);
  outline: none;
}

.head {
  display: flex;
  flex: none;
  gap: var(--space-4);
  align-items: flex-start;
  justify-content: space-between;
  padding: var(--space-6) var(--space-6) 0;
}

.close {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  margin-left: auto;
  padding: 0;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.close:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.body {
  overflow-y: auto;
  min-height: 0;
  padding: var(--space-4) var(--space-6) var(--space-6);
}

@media (max-width: 599px) {
  .backdrop {
    padding: var(--space-2);
  }

  .dialog {
    max-height: 92vh;
  }

  .head {
    padding: var(--space-4) var(--space-4) 0;
  }

  .body {
    padding: var(--space-3) var(--space-4) var(--space-4);
  }
}
</style>
