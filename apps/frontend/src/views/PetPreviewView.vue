<script setup lang="ts">
// Temporary page to review the pet art (story #199). Only registered in dev builds.
import { localIsoDate } from '@/components/pet/mood';
import PetSprite from '@/components/pet/PetSprite.vue';
import ReadingPet from '@/components/pet/ReadingPet.vue';
import { HEART, PET_ANIMALS, WALK_FRAMES, type PetFace } from '@/components/pet/sprites';

const FACES: { face: PetFace; label: string }[] = [
  { face: 'happy', label: 'Happy · read recently' },
  { face: 'neutral', label: 'Neutral' },
  { face: 'sad', label: 'Sad · away for a while' },
  { face: 'starving', label: 'Starving · away too long' },
  { face: 'love', label: 'Love · after a click' },
];

const heartRuns = HEART.flatMap((row, y) =>
  [...row].flatMap((ch, x) => (ch === '.' ? [] : [{ x, y, ch }])),
);
const daysAgo = (days: number) => localIsoDate(new Date(Date.now() - days * 86_400_000));
const LIVE = [
  { label: 'Read today', lastRead: daysAgo(0) },
  { label: '1 day away', lastRead: daysAgo(1) },
  { label: '3 days away', lastRead: daysAgo(3) },
  { label: '8 days away', lastRead: daysAgo(8) },
];

const HEART_COLORS: Record<string, string> = { o: '#432818', H: '#e0445a', J: '#ff9aa8' };
</script>

<template>
  <main class="pet-preview">
    <h1>Reading pets · art preview</h1>
    <p class="note">Temporary page for reviewing the sprites. Not linked from the app.</p>

    <table>
      <thead>
        <tr>
          <th scope="col"></th>
          <th v-for="item in FACES" :key="item.face" scope="col">{{ item.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="animal in PET_ANIMALS" :key="animal">
          <th scope="row">{{ animal }}</th>
          <td v-for="item in FACES" :key="item.face">
            <PetSprite :animal="animal" :face="item.face" :size="128" />
          </td>
        </tr>
      </tbody>
    </table>

    <h2>Walk cycle (side view, mirrored when walking left)</h2>
    <table>
      <tbody>
        <tr v-for="animal in PET_ANIMALS" :key="animal">
          <th scope="row">{{ animal }}</th>
          <td v-for="frame in WALK_FRAMES" :key="`happy-${frame}`">
            <PetSprite :animal="animal" face="happy" :walk-frame="frame - 1" :size="96" />
          </td>
          <td v-for="frame in WALK_FRAMES" :key="`sad-${frame}`">
            <PetSprite :animal="animal" face="sad" :walk-frame="frame - 1" :size="96" />
          </td>
        </tr>
      </tbody>
    </table>

    <h2>Live pets (click them)</h2>
    <div class="live">
      <div v-for="item in LIVE" :key="item.label">
        <h3>{{ item.label }}</h3>
        <ReadingPet :last-read-date="item.lastRead" />
      </div>
    </div>

    <h2>Heart (floats up on click)</h2>
    <svg width="72" height="64" viewBox="0 0 9 8" shape-rendering="crispEdges" aria-hidden="true">
      <rect
        v-for="(px, i) in heartRuns"
        :key="i"
        :x="px.x"
        :y="px.y"
        width="1"
        height="1"
        :fill="HEART_COLORS[px.ch]"
      />
    </svg>
  </main>
</template>

<style scoped>
.pet-preview {
  padding: 24px 16px;
  max-width: 100%;
  overflow-x: auto;
}

table {
  border-collapse: collapse;
}

th,
td {
  padding: 8px;
  text-align: center;
  vertical-align: middle;
}

th[scope='row'] {
  text-transform: capitalize;
}

td {
  background: #fff8ea;
}

.live {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}
</style>
