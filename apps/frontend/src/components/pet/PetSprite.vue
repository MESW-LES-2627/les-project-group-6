<script setup lang="ts">
import { computed } from 'vue';

import {
  composeSprite,
  composeWalkSprite,
  PET_SIZE,
  toRuns,
  type PetAnimal,
  type PetFace,
} from './sprites';

const props = withDefaults(
  defineProps<{
    animal: PetAnimal;
    face?: PetFace;
    /** Rendered size in px; keep it a multiple of 32 so pixels stay square. */
    size?: number;
    /** Walk frame to show in the side pose; omit for the front pose. */
    walkFrame?: number;
  }>(),
  { face: 'neutral', size: 128, walkFrame: undefined },
);

const runs = computed(() => {
  const { animal, face, walkFrame } = props;
  const canWalk = face === 'happy' || face === 'neutral' || face === 'sad';
  const sprite =
    walkFrame !== undefined && canWalk
      ? composeWalkSprite(animal, face, walkFrame)
      : composeSprite(animal, face);
  return toRuns(sprite);
});
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
