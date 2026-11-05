<script setup lang="ts">
// The burgundy band that opens a page, the same plate as the profile's bookplate.
defineProps<{ title: string; titleId: string }>();
</script>

<template>
  <section class="band" :aria-labelledby="titleId">
    <div class="plate">
      <div class="identity">
        <slot name="leading" />
        <div class="details">
          <h1 :id="titleId" class="title">{{ title }}</h1>
          <slot />
        </div>
      </div>
      <div v-if="$slots.actions" class="actions">
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.band {
  padding: 14px;
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
}

.band :focus-visible {
  outline-color: var(--color-on-primary-strong);
}

.plate {
  display: flex;
  gap: var(--space-6) var(--space-10);
  align-items: center;
  justify-content: space-between;
  max-width: 77.25rem;
  min-height: 192px;
  margin: 0 auto;
  padding: var(--space-6) 34px;
  border: 1px solid rgb(255 230 167 / 25%);
}

.identity {
  display: flex;
  gap: var(--space-8);
  align-items: center;
  min-width: 0;
}

.details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 35rem;
  min-width: 0;
}

.title {
  margin: 0;
  color: var(--color-on-primary-strong);
  font-family: var(--font-body);
  font-size: var(--font-size-2xl);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.015em;
}

.details :slotted(p) {
  margin: 0;
  color: var(--color-on-primary);
  font-size: var(--font-size-sm);
}

.details :slotted(.lede) {
  margin-top: 6px;
  font-size: var(--font-size-base);
}

.actions {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 14px;
  align-items: flex-end;
}

/* The light button and the cream text link used inside the plate */
.actions :slotted(.plate-button) {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  height: var(--control-height);
  padding: 0 1.25rem;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-bg);
  color: var(--color-primary);
  font-size: var(--font-size-base);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: background-color var(--duration-fast);
}

.actions :slotted(.plate-button:hover) {
  background: var(--color-surface);
  color: var(--color-primary);
}

.actions :slotted(.plate-link) {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  min-height: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-on-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
  cursor: pointer;
}

.actions :slotted(.plate-link:hover) {
  color: var(--color-on-primary-strong);
  text-decoration: underline;
}

@media (max-width: 899px) {
  .band {
    padding: 10px;
  }

  .plate,
  .identity {
    flex-direction: column;
    align-items: flex-start;
  }

  .plate {
    min-height: 0;
    padding: var(--space-6) 18px;
  }

  .identity {
    gap: 18px;
  }

  .title {
    font-size: var(--font-size-xl);
  }

  .actions {
    align-items: flex-start;
  }
}
</style>
