<script setup>
import { computed, ref } from 'vue';
import { buildCalendarCells, shiftYearMonth } from '../utils/lessonDate';

const props = defineProps({
  yearMonth: { type: String, required: true },
  recordsByDate: { type: Object, default: () => ({}) },
  todayIso: { type: String, default: '' },
  allRecords: { type: Array, default: () => [] },
  syncStatus: { type: Object, default: () => ({ lastSyncAt: 0, lastSyncOk: false, lastSyncMessage: '' }) },
});

const emit = defineEmits(['update:yearMonth', 'select-day', 'open-settings', 'open-dashboard', 'open-record', 'open-timetable']);

/* ───── 搜索 ───── */
const searchExpanded = ref(false);
const searchText = ref('');

const filteredSearchResults = computed(() => {
  const kw = String(searchText.value || '').trim().toLowerCase();
  if (!kw) return [];
  return props.allRecords.filter((r) => {
    if (!r) return false;
    const text = [
      r.course, r.lessonSchedule, r.lessonDate, r.datetime,
      ...(Array.isArray(r.students) ? r.students.map(s => s.name || s) : []),
    ].join(' ').toLowerCase();
    return text.includes(kw);
  });
});

function syncTimeAgo(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${Math.floor(diff / 86400000)} 天前`;
}

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
      <!-- 搜索框 -->
      <div class="relative min-w-0 flex-1">
        <input
          type="search"
          inputmode="search"
          placeholder="搜索记录…"
          autocomplete="off"
          class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pl-9 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          :value="searchText"
          @input="searchText = $event.target.value; searchExpanded = true;"
          @focus="searchExpanded = true"
        />
        <svg class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" /></svg>
        <button
          v-if="searchText"
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:text-slate-600"
          @click="searchText = ''; searchExpanded = false"
        >
          ✕
        </button>
        <!-- 搜索结果浮层 -->
        <div
          v-if="searchExpanded && searchText"
          class="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div v-if="filteredSearchResults.length" class="py-1">
            <button
              v-for="item in filteredSearchResults"
              :key="item.id"
              type="button"
              class="w-full px-4 py-2.5 text-left text-sm hover:bg-indigo-50 border-b border-slate-100 last:border-0"
              @click="$emit('open-record', item); searchExpanded = false; searchText = ''"
            >
              <span class="font-medium text-slate-900">{{ item.course || '（未填写课程）' }}</span>
              <span class="text-slate-400 ml-2">{{ item.lessonSchedule || '' }}</span>
              <span class="text-xs text-slate-400 block">{{ item.lessonDate || '' }}</span>
            </button>
          </div>
          <p v-else class="px-4 py-3 text-xs text-slate-400 text-center">未找到匹配的记录</p>
        </div>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 active:bg-indigo-100"
        @click="$emit('open-timetable')"
      >
        📅 课表
      </button>
      <button
        type="button"
        class="shrink-0 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 active:bg-indigo-100"
        @click="$emit('open-dashboard')"
      >
        看板
      </button>
      <button
        type="button"
        class="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 active:bg-slate-50"
        @click="$emit('open-settings')"
      >
        更多
      </button>
    </div>

    <!-- 云同步状态指示器 -->
    <div v-if="syncStatus.lastSyncAt" class="flex items-center justify-center gap-1.5">
      <span
        class="inline-block h-2 w-2 rounded-full"
        :class="syncStatus.lastSyncOk ? 'bg-emerald-500' : 'bg-rose-400'"
      />
      <span class="text-xs text-slate-400">
        {{ syncStatus.lastSyncOk ? '已同步' : '同步失败' }} · {{ syncTimeAgo(syncStatus.lastSyncAt) }}
      </span>
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
          class="relative flex aspect-square min-h-[44px] flex-col items-center justify-center rounded-lg text-sm transition-colors"
          :class="[
            cell.inMonth
              ? 'text-slate-800 active:bg-indigo-50 hover:bg-slate-50'
              : 'text-transparent pointer-events-none',
            cell.iso === todayIso && cell.inMonth ? 'ring-3 ring-indigo-400 ring-offset-1' : '',
            countForDate(cell.iso) > 0 && cell.inMonth ? 'font-semibold text-indigo-800 underline decoration-indigo-300 decoration-2 underline-offset-2' : '',
          ]"
          :disabled="!cell.inMonth"
          @click="onDayClick(cell)"
        >
          <span v-if="cell.inMonth">{{ cell.day }}</span>
          <span
            v-if="cell.inMonth && countForDate(cell.iso) > 0"
            class="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5"
          >
            <span class="h-2 w-2 rounded-full bg-indigo-500" />
            <span v-if="countForDate(cell.iso) > 1" class="text-[11px] text-indigo-600 leading-none">
              {{ countForDate(cell.iso) }}
            </span>
          </span>
        </button>
      </div>
    </div>
  </section>
</template>
