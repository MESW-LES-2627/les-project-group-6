<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import PetSprite from './PetSprite.vue';
import {
  getPetMood,
  localIsoDate,
  moodCaption,
  PET_NAMES,
  pickAction,
  walkSpeed,
  type PetAction,
} from './mood';
import {
  HEART,
  PET_ANIMALS,
  SHARED_PALETTE,
  toRuns,
  type PetAnimal,
  type PetFace,
} from './sprites';

const props = withDefaults(
  defineProps<{
    /** Last day that counted for the streak (`YYYY-MM-DD`), or null before the first. */
    lastReadDate: string | null;
    /** Injected in tests; defaults to the current time. */
    now?: Date;
    /** Rendered size of the pet in px (multiple of 32). */
    size?: number;
  }>(),
  { now: undefined, size: 96 },
);

const STORAGE_KEY = 'bookmarked.pet';
const LOVE_MS = 1500;
const ACTION_MS: Record<Exclude<PetAction, 'walk'>, number> = {
  idle: 2500,
  look: 1800,
  hop: 1200,
  wiggle: 1000,
  sleep: 6000,
};

function loadAnimal(): PetAnimal {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (PET_ANIMALS as string[]).includes(saved)) return saved as PetAnimal;
  } catch {
    // storage blocked: fall back to the default pet
  }
  return 'cat';
}

const animal = ref<PetAnimal>(loadAnimal());
const choosing = ref(false);
const name = computed(() => PET_NAMES[animal.value]);
const mood = computed(() => getPetMood(props.lastReadDate, localIsoDate(props.now ?? new Date())));
const caption = computed(() => moodCaption(name.value, mood.value, props.lastReadDate === null));

const action = ref<PetAction>('idle');
const x = ref(50); // position on the track, in % of its width
const facingLeft = ref(false);
const walkMs = ref(0);
const loving = ref(false);
const heartKey = ref(0);

const face = computed<PetFace>(() => {
  if (loving.value) return 'love';
  if (action.value === 'sleep') return 'sleep';
  return mood.value;
});

const heartRuns = toRuns({ grid: HEART, palette: SHARED_PALETTE });

let actionTimer: ReturnType<typeof setTimeout> | undefined;
let loveTimer: ReturnType<typeof setTimeout> | undefined;
let reducedMotion = false;

function schedule(ms: number, next: () => void) {
  clearTimeout(actionTimer);
  actionTimer = setTimeout(next, ms);
}

function rest() {
  action.value = 'idle';
  schedule(2000 + Math.random() * 4000, nextAction);
}

function nextAction() {
  const next = pickAction(mood.value);
  if (next === 'walk') {
    let target = Math.random() * 100;
    if (Math.abs(target - x.value) < 20) target = x.value < 50 ? x.value + 40 : x.value - 40;
    facingLeft.value = target < x.value;
    walkMs.value = Math.abs(target - x.value) * walkSpeed(mood.value);
    action.value = 'walk';
    x.value = target;
    schedule(walkMs.value, rest);
    return;
  }
  action.value = next;
  schedule(ACTION_MS[next], rest);
}

function pet() {
  if (loving.value) return; // ignore spam clicks while the heart is showing
  loving.value = true;
  heartKey.value++;
  clearTimeout(loveTimer);
  loveTimer = setTimeout(() => (loving.value = false), LOVE_MS);
}

function choose(next: PetAnimal) {
  animal.value = next;
  choosing.value = false;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // storage blocked: the choice lasts until the page reloads
  }
}

// A sleepy pet wakes up when its mood changes (e.g. the reader just read)
watch(mood, () => {
  if (!reducedMotion) rest();
});

onMounted(() => {
  reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  if (!reducedMotion) rest();
});

onBeforeUnmount(() => {
  clearTimeout(actionTimer);
  clearTimeout(loveTimer);
});
</script>

<template>
  <div class="reading-pet">
    <div class="pet-track" :style="{ height: `${size + 8}px` }">
      <button
        type="button"
        class="pet-body"
        :style="{
          left: `${x}%`,
          transform: `translateX(-${x}%)`,
          transitionDuration: action === 'walk' ? `${walkMs}ms` : '0ms',
        }"
        :aria-label="`${caption} Pet ${name}.`"
        @click="pet"
      >
        <span :class="['pet-facing', { left: facingLeft }]">
          <span :class="['pet-motion', `is-${action}`]" data-test="pet-motion">
            <PetSprite :animal="animal" :face="face" :size="size" />
          </span>
        </span>
        <span v-if="action === 'sleep' && !loving" class="pet-zzz" aria-hidden="true">z</span>
        <svg
          v-if="loving"
          :key="heartKey"
          class="pet-heart"
          data-test="pet-heart"
          width="27"
          height="24"
          viewBox="0 0 9 8"
          shape-rendering="crispEdges"
          aria-hidden="true"
        >
          <rect
            v-for="(run, i) in heartRuns"
            :key="i"
            :x="run.x"
            :y="run.y"
            :width="run.width"
            height="1"
            :fill="run.color"
          />
        </svg>
      </button>
    </div>

    <p class="pet-caption">{{ caption }}</p>

    <button
      type="button"
      class="pet-change"
      :aria-expanded="choosing"
      aria-controls="pet-picker"
      @click="choosing = !choosing"
    >
      {{ choosing ? 'Close' : 'Change pet' }}
    </button>
    <div
      v-if="choosing"
      id="pet-picker"
      class="pet-picker"
      role="group"
      aria-label="Choose your pet"
    >
      <button
        v-for="option in PET_ANIMALS"
        :key="option"
        type="button"
        class="pet-option"
        :aria-pressed="option === animal"
        :aria-label="`${PET_NAMES[option]} the ${option}`"
        @click="choose(option)"
      >
        <PetSprite :animal="option" face="happy" :size="32" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.reading-pet {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.pet-track {
  position: relative;
  width: 100%;
  border-bottom: 2px dotted var(--color-border);
}

.pet-body {
  position: absolute;
  bottom: 0;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  transition-property: left, transform;
  transition-timing-function: linear;
}

.pet-body:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.pet-facing,
.pet-motion {
  display: block;
}

.pet-facing.left {
  transform: scaleX(-1);
}

.pet-motion.is-walk {
  animation: pet-bob 0.36s steps(2) infinite;
}

.pet-motion.is-hop {
  animation: pet-hop 0.6s ease-out 2;
}

.pet-motion.is-look {
  animation: pet-look 1.8s steps(1) 1;
}

.pet-motion.is-wiggle {
  animation: pet-wiggle 0.5s ease-in-out 2;
}

.pet-zzz {
  position: absolute;
  top: 0;
  right: 4px;
  font-family: var(--font-heading);
  font-weight: 700;
  color: var(--color-text-muted);
  animation: pet-zzz 2s ease-out infinite;
}

.pet-heart {
  position: absolute;
  top: -8px;
  left: 50%;
  margin-left: -13px;
  animation: pet-heart 1.5s ease-out forwards;
}

.pet-caption {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.pet-change {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary);
  font: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.pet-change:hover {
  text-decoration: underline;
}

.pet-picker {
  display: flex;
  gap: var(--space-2);
}

.pet-option {
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  cursor: pointer;
}

.pet-option:hover,
.pet-option[aria-pressed='true'] {
  border-color: var(--color-primary);
}

@keyframes pet-bob {
  50% {
    transform: translateY(-3px);
  }
}

@keyframes pet-hop {
  40% {
    transform: translateY(-16px);
  }
}

@keyframes pet-look {
  30% {
    transform: scaleX(-1);
  }
  65% {
    transform: scaleX(1);
  }
}

@keyframes pet-wiggle {
  25% {
    transform: rotate(-6deg);
  }
  75% {
    transform: rotate(6deg);
  }
}

@keyframes pet-zzz {
  from {
    opacity: 0;
    transform: translate(0, 0);
  }
  30% {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: translate(10px, -18px);
  }
}

@keyframes pet-heart {
  from {
    opacity: 1;
    transform: translateY(0) scale(0.6);
  }
  20% {
    transform: translateY(-6px) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-36px) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pet-motion,
  .pet-zzz,
  .pet-heart {
    animation: none;
  }
}
</style>
