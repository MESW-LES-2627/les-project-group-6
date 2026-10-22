<script setup lang="ts">
import { computed } from 'vue';

import type { Streak } from '@/types/profile';
import { formatDayMonth, parseIsoDate } from '@/utils/date';

const props = defineProps<{ streak: Streak }>();

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const days = computed(() =>
  props.streak.days.map((day, i) => {
    const isToday = i === props.streak.days.length - 1;
    let status = day.read ? 'read' : 'no reading';
    if (isToday) status = day.read ? 'read, today' : 'today, not read yet';
    return {
      ...day,
      isToday,
      dayOfMonth: parseIsoDate(day.date).getDate(),
      label: `${formatDayMonth(day.date)}, ${status}`,
    };
  }),
);

// Column headers follow the first day shown, so the grid does not need to start on a Monday
const weekdays = computed(() =>
  props.streak.days.slice(0, 7).map((day) => WEEKDAY_LETTERS[parseIsoDate(day.date).getDay()]),
);

const range = computed(() => {
  const first = props.streak.days[0];
  const last = props.streak.days[props.streak.days.length - 1];
  return first && last ? `${formatDayMonth(first.date)} to ${formatDayMonth(last.date)}` : '';
});

const summary = computed(() => {
  const { current, longest, freezesLeft } = props.streak;
  const freezes = `${freezesLeft} ${freezesLeft === 1 ? 'freeze' : 'freezes'} left`;
  if (current === 0) return `No streak yet · ${freezes}`;
  return `${current} ${current === 1 ? 'day' : 'days'}, longest ${longest} · ${freezes}`;
});
</script>

<template>
  <section class="streak" aria-labelledby="streak-title">
    <div class="heading">
      <h2 id="streak-title" class="section-title">Streak</h2>
      <span class="muted range">{{ range }}</span>
    </div>

    <template v-if="days.length > 0">
      <div class="weekdays" aria-hidden="true">
        <span v-for="(letter, i) in weekdays" :key="i">{{ letter }}</span>
      </div>
      <ol class="days" :aria-label="`Reading days, last ${days.length} days`">
        <li v-for="day in days" :key="day.date">
          <span :class="['day', { read: day.read, today: day.isToday && day.read }]">
            <span aria-hidden="true">{{ day.dayOfMonth }}</span>
            <span class="sr-only">{{ day.label }}</span>
          </span>
        </li>
      </ol>
    </template>

    <p class="summary">{{ summary }}</p>
  </section>
</template>

<style scoped>
.streak {
  padding: var(--space-8) 0 34px;
}

.heading {
  display: flex;
  gap: var(--space-3);
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 18px;
}

.range {
  font-size: var(--text-sm);
}

.weekdays,
.days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.weekdays {
  gap: 6px;
  margin-bottom: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  text-align: center;
}

.days {
  gap: var(--space-2) 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.days li {
  display: flex;
  justify-content: center;
}

.day {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.day.read {
  background: var(--color-streak-read);
  color: var(--color-primary);
  font-weight: 600;
}

.day.today {
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
}

.summary {
  margin: 18px 0 0;
}
</style>
