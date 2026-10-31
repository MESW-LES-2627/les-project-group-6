<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

// No pause: a session is finished and a new one started instead, so the
// server can time it from start to finish.
const props = withDefaults(
  defineProps<{
    /** Time already spent reading when the screen opens, in seconds. */
    initialSeconds?: number;
    /** The design shows an already-running session. */
    autoStart?: boolean;
    /** The session is being saved or cancelled; the actions are disabled. */
    busy?: boolean;
  }>(),
  { initialSeconds: 0, autoStart: true, busy: false },
);

const emit = defineEmits<{
  stop: [];
  cancel: [];
}>();

const elapsedSeconds = ref(props.initialSeconds);
let interval: number | undefined;

const formattedTime = computed(() => {
  const total = elapsedSeconds.value;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
});

function clearTimer() {
  if (interval !== undefined) {
    window.clearInterval(interval);
    interval = undefined;
  }
}

function startTimer() {
  clearTimer();
  interval = window.setInterval(() => {
    elapsedSeconds.value += 1;
  }, 1000);
}

function stopSession() {
  clearTimer();
  emit('stop');
}

function cancelSession() {
  emit('cancel');
}

onMounted(() => {
  if (props.autoStart) startTimer();
});

onBeforeUnmount(clearTimer);
</script>

<template>
  <section class="timer" aria-labelledby="timer-label">
    <p id="timer-label" class="timer-label">Elapsed reading time</p>

    <output class="timer-time" role="timer" :aria-label="`Elapsed time ${formattedTime}`">
      {{ formattedTime }}
    </output>

    <p class="timer-status">
      <span class="status-dot" aria-hidden="true"></span>
      Active <span aria-hidden="true">•</span> Finish and start a new session to take a break
    </p>

    <div class="timer-actions">
      <button
        type="button"
        class="timer-button timer-button--cancel"
        :disabled="busy"
        @click="cancelSession"
      >
        Cancel session
      </button>

      <button
        type="button"
        class="timer-button timer-button--stop"
        :disabled="busy"
        @click="stopSession"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
        </svg>
        Stop &amp; save session
      </button>
    </div>

    <p class="timer-hint">Cancelling discards this session; no minutes are saved.</p>
  </section>
</template>

<style scoped>
.timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 27px;
  text-align: center;
}

.timer-label {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.5625rem;
  font-weight: var(--font-weight-medium);
  letter-spacing: 0.08em;
  line-height: 1.2;
  text-transform: uppercase;
}

.timer-time {
  display: block;
  margin-top: 28px;
  font-family: var(--font-heading);
  font-size: 4.625rem;
  font-variant-numeric: tabular-nums;
  font-weight: var(--font-weight-normal);
  letter-spacing: -0.035em;
  line-height: 1;
}

.timer-status {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
  justify-content: center;
  margin: 24px 0 0;
  color: var(--color-text-muted);
  font-size: 0.625rem;
  line-height: 1.35;
}

.status-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-accent);
}

.timer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: center;
  margin-top: 19px;
}

.timer-button {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  justify-content: center;
  height: 42px;
  padding: 0 14px;
  border-radius: var(--radius-control);
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition:
    background-color var(--duration-fast),
    border-color var(--duration-fast);
}

.timer-button--cancel {
  min-width: 90px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
}

.timer-button--cancel:hover {
  border-color: var(--color-accent);
  background: var(--color-surface-hover);
}

.timer-button--stop {
  min-width: 174px;
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
}

.timer-button:disabled {
  cursor: progress;
  opacity: 0.6;
}

.timer-button--stop:hover {
  border-color: var(--color-primary-hover);
  background: var(--color-primary-hover);
}

.timer-hint {
  margin: 28px 0 0;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  line-height: 1.4;
}

@media (max-width: 639px) {
  .timer {
    margin-top: 26px;
  }

  .timer-time {
    margin-top: 22px;
    font-size: 3.75rem;
  }

  .timer-actions {
    flex-wrap: nowrap;
    gap: 10px;
    width: 100%;
  }

  .timer-button {
    flex: 1 1 0;
    min-width: 0;
    padding-inline: 10px;
  }

  .timer-button--stop {
    min-width: 0;
  }
}
</style>
