<script setup lang="ts">
defineProps<{ label: string; description?: string }>();

const model = defineModel<boolean>({ required: true });
</script>

<template>
  <div class="toggle">
    <div>
      <span class="label">{{ label }}</span>
      <span v-if="description" class="description">{{ description }}</span>
    </div>
    <button
      type="button"
      role="switch"
      class="switch"
      :aria-checked="model"
      :aria-label="label"
      @click="model = !model"
    >
      <span class="knob"></span>
    </button>
  </div>
</template>

<style scoped>
.toggle {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  justify-content: space-between;
}

.label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.description {
  display: block;
  margin-top: 2px;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.switch {
  position: relative;
  flex-shrink: 0;
  width: 2.5rem;
  height: 1.5rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--color-track);
  cursor: pointer;
  transition: background-color var(--duration-fast);
}

.switch[aria-checked='true'] {
  background: var(--color-primary);
}

.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 50%;
  background: var(--color-on-primary-strong);
  transition: transform var(--duration-fast);
}

.switch[aria-checked='true'] .knob {
  transform: translateX(1rem);
}
</style>
