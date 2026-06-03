<script setup>
import { computed } from 'vue';
import { buildCalendarCells, shiftYearMonth } from '../utils/lessonDate';

const props = defineProps({
  yearMonth: { type: String, required: true },
  recordsByDate: { type: Object, default: () => ({}) },
  todayIso: { type: String, default: '' },
});

const emit = defineEmits(['update:yearMonth', 'select-day', 'open-settings']);

const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];

const cells = computed(() => buildCalendarCells(props.yearMonth));

const monthLabel = computed(() => {
  const m = /^(\d{4})-(\d{2})$/.exec(props.yearMonth || '');
  if (!m) return props.yearMonth;
  return `${m[1]}年${parseInt(m[2], 10)}月`;
});

function prevMonth() {
  emit('update:yearMonth', shiftYearMonth(props.yearMonth, -1));
}

function nextMonth() {
  emit('update:yearMonth', shiftYearMonth(props.yearMonth, 1));
}

function countForDate(iso) {
  const list = props.recordsByDate[iso];
  return Array.isArray(list) ? list.length : 0;
}

function onDayClick(cell) {
  if (!cell.inMonth || !cell.iso) return;
  emit('select-day', cell.iso);
}
</script>

<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between gap-2">
      <button
        type="button"
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 active:bg-slate-50"
        aria-label="上一月"
        @click="prevMonth"
      >
        ‹
      </button>
      <div class="text-center min-w-0 flex-1">
        <h1 class="text-lg font-semibold text-slate-900">上课记录</h1>
        <p class="text-sm text-slate-500">{{ monthLabel }}</p>
      </div>
      <button
        type="button"
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 active:bg-slate-50"
        aria-label="下一月"
        @click="nextMonth"
      >
        ›
      </button>
    </header>

    <div class="flex items-center gap-2">
      <input
        type="month"
        class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        :value="yearMonth"
        @input="emit('update:yearMonth', $event.target.value)"
      />
      <button
        type="button"
        class="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 active:bg-slate-50"
        @click="emit('open-settings')"
      >
        更多
      </button>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div class="grid grid-cols-7 gap-1 mb-1">
        <span
          v-for="w in weekdayLabels"
          :key="w"
          class="text-center text-xs font-medium text-slate-400 py-1"
        >
          {{ w }}
        </span>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <button
          v-for="(cell, idx) in cells"
          :key="`${cell.iso}-${idx}`"
          type="button"
          class="relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors"
          :class="[
            cell.inMonth
              ? 'text-slate-800 active:bg-indigo-50 hover:bg-slate-50'
              : 'text-transparent pointer-events-none',
            cell.iso === todayIso && cell.inMonth ? 'ring-2 ring-indigo-400 ring-offset-1' : '',
            countForDate(cell.iso) > 0 && cell.inMonth ? 'font-semibold text-indigo-800' : '',
          ]"
          :disabled="!cell.inMonth"
          @click="onDayClick(cell)"
        >
          <span v-if="cell.inMonth">{{ cell.day }}</span>
          <span
            v-if="cell.inMonth && countForDate(cell.iso) > 0"
            class="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            <span v-if="countForDate(cell.iso) > 1" class="text-[9px] text-indigo-600 leading-none">
              {{ countForDate(cell.iso) }}
            </span>
          </span>
        </button>
      </div>
    </div>
  </section>
</template>
