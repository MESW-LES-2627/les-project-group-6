<script setup lang="ts">
import { computed } from 'vue';

import { composeSprite, PET_SIZE, toRuns, type PetAnimal, type PetFace } from './sprites';

const props = withDefaults(
  defineProps<{
    animal: PetAnimal;
    face?: PetFace;
    /** Rendered size in px; keep it a multiple of 32 so pixels stay square. */
    size?: number;
  }>(),
  { face: 'neutral', size: 128 },
);

const runs = computed(() => toRuns(composeSprite(props.animal, props.face)));
</script>

<template>
  <svg
    class="pet-sprite"
    :width="size"
    :height="size"
    :viewBox="`0 0 ${PET_SIZE} ${PET_SIZE}`"
    shape-rendering="crispEdges"
    aria-hidden="true"
    focusable="false"
  >
    <rect
      v-for="(run, i) in runs"
      :key="i"
      :x="run.x"
      :y="run.y"
      :width="run.width"
      height="1"
      :fill="run.color"
    />
  </svg>
</template>

<style scoped>
.pet-sprite {
  display: block;
  image-rendering: pixelated;
}
</style>
