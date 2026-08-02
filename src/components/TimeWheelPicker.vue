<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue';

const props = defineProps({
  modelValue: { type: Object, default: () => ({ start: '', end: '' }) },
});

const emit = defineEmits(['update:modelValue']);

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const ROW_HEIGHT = 36;
const VISIBLE_ROWS = 5;

/* parse "HH:mm" into { h, m } with minute snapped to nearest 5 */
function parseHM(str) {
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(String(str || '').trim());
  if (!m) return null;
  let h = parseInt(m[1], 10);
  let min = parseInt(m[2], 10);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  h = Math.min(23, Math.max(0, h));
  min = Math.min(59, Math.max(0, min));
  /* snap minute to nearest 5 */
  min = Math.round(min / 5) * 5;
  if (min === 60) { min = 55; }
  return { h, m: min };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function hmToStr(h, m) {
  return `${pad2(h)}:${pad2(m)}`;
}

function minuteIndex(min) {
  const idx = MINUTES.indexOf(min);
  return idx === -1 ? 0 : idx;
}

/* internal raw selected indices */
const startHourIdx = ref(0);
const startMinIdx = ref(0);
const endHourIdx = ref(0);
const endMinIdx = ref(0);

/* element refs for each column scroll container */
const colRefs = {
  startHour: ref(null),
  startMin: ref(null),
  endHour: ref(null),
  endMin: ref(null),
};

const columns = computed(() => [
  { key: 'startHour', values: HOURS, idxRef: startHourIdx, colRef: colRefs.startHour, label: '开始时' },
  { key: 'startMin', values: MINUTES, idxRef: startMinIdx, colRef: colRefs.startMin, label: '开始分', fmt: (v) => pad2(v) },
  { key: 'endHour', values: HOURS, idxRef: endHourIdx, colRef: colRefs.endHour, label: '结束时' },
  { key: 'endMin', values: MINUTES, idxRef: endMinIdx, colRef: colRefs.endMin, label: '结束分', fmt: (v) => pad2(v) },
]);

/* ---- derived display values ---- */
const startTimeStr = computed(() => hmToStr(HOURS[startHourIdx.value], MINUTES[startMinIdx.value]));
const endTimeStr = computed(() => hmToStr(HOURS[endHourIdx.value], MINUTES[endMinIdx.value]));

const durationText = computed(() => {
  const startTotal = HOURS[startHourIdx.value] * 60 + MINUTES[startMinIdx.value];
  const endTotal = HOURS[endHourIdx.value] * 60 + MINUTES[endMinIdx.value];
  let diff = endTotal - startTotal;
  if (diff < 0) diff += 24 * 60;
  const hh = Math.floor(diff / 60);
  const mm = diff % 60;
  if (hh === 0 && mm === 0) return '0 分钟';
  if (hh === 0) return `${mm} 分钟`;
  if (mm === 0) return `${hh} 小时`;
  return `${hh} 小时 ${mm} 分钟`;
});

/* ---- sync internal indices from modelValue ---- */
function syncFromModel() {
  const mv = props.modelValue;
  let startStr = '';
  let endStr = '';
  if (mv && typeof mv === 'object') {
    startStr = String(mv.start || '');
    endStr = String(mv.end || '');
  } else if (typeof mv === 'string' && mv) {
    /* tolerate old string format like "14:00-16:00" */
    const m = /^(\d{1,2}:\d{2})\s*[-—~至到]\s*(\d{1,2}:\d{2})/.exec(mv);
    if (m) { startStr = m[1]; endStr = m[2]; }
  }
  const s = parseHM(startStr) || { h: 9, m: 0 };
  const e = parseHM(endStr) || { h: 11, m: 0 };
  startHourIdx.value = HOURS.indexOf(s.h) === -1 ? 0 : HOURS.indexOf(s.h);
  startMinIdx.value = minuteIndex(s.m);
  endHourIdx.value = HOURS.indexOf(e.h) === -1 ? 0 : HOURS.indexOf(e.h);
  endMinIdx.value = minuteIndex(e.m);
  nextTick(scrollAllToPosition);
}

/* ---- scroll a single column to current index ---- */
function scrollColToPosition(colKey) {
  const col = columns.value.find((c) => c.key === colKey);
  if (!col) return;
  const el = col.colRef.value;
  if (!el) return;
  el.scrollTo({ top: col.idxRef.value * ROW_HEIGHT, behavior: 'auto' });
}

function scrollAllToPosition() {
  for (const col of columns.value) {
    scrollColToPosition(col.key);
  }
}

/* ---- handle scroll: snap to nearest index ---- */
let scrollTimers = {};
function onColScroll(colKey) {
  const col = columns.value.find((c) => c.key === colKey);
  if (!col) return;
  if (scrollTimers[colKey]) clearTimeout(scrollTimers[colKey]);
  scrollTimers[colKey] = window.setTimeout(() => {
    const el = col.colRef.value;
    if (!el) return;
    const maxIdx = col.values.length - 1;
    let idx = Math.round(el.scrollTop / ROW_HEIGHT);
    idx = Math.min(maxIdx, Math.max(0, idx));
    if (idx !== col.idxRef.value) {
      col.idxRef.value = idx;
    }
    /* snap */
    const targetTop = idx * ROW_HEIGHT;
    if (Math.abs(el.scrollTop - targetTop) > 1) {
      el.scrollTo({ top: targetTop, behavior: 'smooth' });
    }
  }, 80);
}

/* ---- arrow buttons: step one ---- */
function stepCol(colKey, direction) {
  const col = columns.value.find((c) => c.key === colKey);
  if (!col) return;
  const maxIdx = col.values.length - 1;
  let idx = col.idxRef.value + direction;
  if (idx < 0) idx = 0;
  if (idx > maxIdx) idx = maxIdx;
  col.idxRef.value = idx;
  const el = col.colRef.value;
  if (el) el.scrollTo({ top: idx * ROW_HEIGHT, behavior: 'smooth' });
}

/* ---- emit updates whenever indices change ---- */
watch(
  [startHourIdx, startMinIdx, endHourIdx, endMinIdx],
  () => {
    const payload = {
      start: startTimeStr.value,
      end: endTimeStr.value,
    };
    emit('update:modelValue', payload);
  },
);

/* ---- quick presets ---- */
const presets = [
  { label: '上午', start: '09:00', end: '11:00' },
  { label: '下午', start: '14:00', end: '16:00' },
  { label: '晚上', start: '19:00', end: '21:00' },
];

function applyPreset(p) {
  const s = parseHM(p.start) || { h: 9, m: 0 };
  const e = parseHM(p.end) || { h: 11, m: 0 };
  startHourIdx.value = HOURS.indexOf(s.h);
  startMinIdx.value = minuteIndex(s.m);
  endHourIdx.value = HOURS.indexOf(e.h);
  endMinIdx.value = minuteIndex(e.m);
  nextTick(scrollAllToPosition);
}

/* ---- init ---- */
onMounted(() => {
  syncFromModel();
});

watch(
  () => props.modelValue,
  () => {
    /* only re-sync if external value differs from current display */
    const mv = props.modelValue;
    const extStart = mv && typeof mv === 'object' ? String(mv.start || '') : '';
    const extEnd = mv && typeof mv === 'object' ? String(mv.end || '') : '';
    if (extStart !== startTimeStr.value || extEnd !== endTimeStr.value) {
      syncFromModel();
    }
  },
  { deep: true },
);
</script>

<template>
  <div class="select-none">
    <!-- 4-column wheel area -->
    <div class="rounded-xl border border-slate-200 bg-white p-2">
      <div class="relative overflow-hidden">
        <!-- center highlight band -->
        <div
          class="pointer-events-none absolute left-0 right-0 z-10"
          :style="{
            top: ((VISIBLE_ROWS - 1) / 2) * ROW_HEIGHT + 'px',
            height: ROW_HEIGHT + 'px',
          }"
        >
          <div
            class="h-full w-full border-t-[0.5px] border-b-[0.5px]"
            style="background-color: #E6F1FB; border-color: #378ADD;"
          />
        </div>

        <div class="relative z-20 flex" :style="{ height: (VISIBLE_ROWS * ROW_HEIGHT) + 'px' }">
          <div
            v-for="col in columns"
            :key="col.key"
            class="flex flex-1 flex-col"
          >
            <!-- up arrow -->
            <button
              type="button"
              class="flex h-7 items-center justify-center text-slate-400 active:text-indigo-600"
              @click="stepCol(col.key, -1)"
            >
              ▲
            </button>
            <!-- scrollable column -->
            <div
              :ref="(el) => { if (el) col.colRef.value = el; }"
              class="flex-1 overflow-y-auto scrollbar-hide"
              :style="{ height: (VISIBLE_ROWS * ROW_HEIGHT) + 'px', scrollSnapType: 'y mandatory' }"
              @scroll.passive="onColScroll(col.key)"
            >
              <!-- top padding -->
              <div :style="{ height: ((VISIBLE_ROWS - 1) / 2) * ROW_HEIGHT + 'px' }" />
              <div
                v-for="(val, vi) in col.values"
                :key="vi"
                class="flex items-center justify-center transition-opacity"
                :style="{
                  height: ROW_HEIGHT + 'px',
                  scrollSnapAlign: 'center',
                  opacity:
                    vi === col.idxRef.value
                      ? 1
                      : Math.abs(vi - col.idxRef.value) <= 1
                        ? 0.55
                        : 0.28,
                }"
              >
                <span
                  class="text-base tabular-nums"
                  :class="vi === col.idxRef.value
                    ? 'font-bold text-indigo-700'
                    : 'text-slate-600'"
                >
                  {{ col.fmt ? col.fmt(val) : val }}
                </span>
              </div>
              <!-- bottom padding -->
              <div :style="{ height: ((VISIBLE_ROWS - 1) / 2) * ROW_HEIGHT + 'px' }" />
            </div>
            <!-- down arrow -->
            <button
              type="button"
              class="flex h-7 items-center justify-center text-slate-400 active:text-indigo-600"
              @click="stepCol(col.key, 1)"
            >
              ▼
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- labels under wheels -->
    <div class="mt-1 flex px-2">
      <div v-for="col in columns" :key="col.key" class="flex-1 text-center text-xs text-slate-400">
        {{ col.label }}
      </div>
    </div>

    <!-- real-time display -->
    <div class="mt-3 flex items-center justify-center gap-2 rounded-lg bg-indigo-50 px-3 py-2">
      <span class="text-sm font-semibold tabular-nums text-indigo-700">{{ startTimeStr }}</span>
      <span class="text-sm text-slate-400">—</span>
      <span class="text-sm font-semibold tabular-nums text-indigo-700">{{ endTimeStr }}</span>
      <span class="ml-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-indigo-600">
        {{ durationText }}
      </span>
    </div>

    <!-- presets -->
    <div class="mt-3 flex flex-wrap gap-2">
      <button
        v-for="p in presets"
        :key="p.label"
        type="button"
        class="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 active:bg-indigo-50"
        @click="applyPreset(p)"
      >
        {{ p.label }} {{ p.start }}-{{ p.end }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
