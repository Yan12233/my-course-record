<script setup>
import { computed } from 'vue';
import ScheduleCard from './ScheduleCard.vue';
import { slotStartMinutes } from '../../composables/useDatabase';
import { COURSE_CARD_COLORS, getCourseColorIndex } from '../../utils/scheduleConstants';

/** 今日星期 */
const todayWeekday = computed(() => {
  const d = new Date().getDay();
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  return weekdays[(d + 6) % 7];
});

const props = defineProps({
  items: { type: Array, default: () => [] },
  slots: { type: Array, default: () => [] },
  weekdays: { type: Array, default: () => [] },
  courseList: { type: Array, default: () => [] },
  conflictCell: { type: Object, default: null },
});

const emit = defineEmits(['cell-click', 'drop', 'card-click', 'card-record']);

/** 将排课项按 weekday + slot 分组到网格格子中 */
const gridMap = computed(() => {
  const map = new Map();
  for (const item of props.items) {
    const slotRow = findSlotRow(item.slot);
    const key = `${item.weekday}__${slotRow ? slotRow.start : '__other__'}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
});

/** 找到 slot 对应的固定时段行 */
function findSlotRow(slot) {
  const startMinutes = slotStartMinutes(slot);
  if (startMinutes === Infinity) return null;
  for (const row of props.slots) {
    const rowStart = parseInt(row.start.split(':')[0], 10) * 60 + parseInt(row.start.split(':')[1], 10);
    const rowEnd = parseInt(row.end.split(':')[0], 10) * 60 + parseInt(row.end.split(':')[1], 10);
    if (startMinutes >= rowStart && startMinutes < rowEnd) return row;
  }
  return null;
}

/** 获取某格子的排课项列表 */
function getCellItems(weekday, slotRow) {
  const key = `${weekday}__${slotRow ? slotRow.start : '__other__'}`;
  return gridMap.value.get(key) || [];
}

/** 是否有不在固定时段中的排课项 */
const hasOtherSlotItems = computed(() => {
  return props.items.some((item) => !findSlotRow(item.slot));
});

/** 获取课程颜色 */
function getColorClass(course) {
  const idx = getCourseColorIndex(course, props.courseList);
  return COURSE_CARD_COLORS[idx];
}

function onCellClick(weekday, slotRow) {
  emit('cell-click', {
    weekday,
    slot: slotRow ? { start: slotRow.start, end: slotRow.end } : { start: '', end: '' },
  });
}

function onCardClick(item) {
  emit('card-click', item);
}

function onCardRecord(item) {
  emit('card-record', item);
}

function onCardDrop(payload) {
  emit('drop', payload);
}

function isConflictCell(weekday, slotStart) {
  if (!props.conflictCell) return false;
  return props.conflictCell.weekday === weekday && props.conflictCell.slotStart === slotStart;
}
</script>

<template>
  <div class="schedule-grid overflow-x-auto">
    <div class="min-w-[700px]">
      <!-- 表头行 -->
      <div class="grid gap-1 mb-1" style="grid-template-columns: 64px repeat(7, 1fr)">
        <div class="text-[10px] text-slate-400 dark:text-slate-500 text-center flex items-center justify-center">时段</div>
        <div
          v-for="day in weekdays"
          :key="day"
          class="text-xs font-semibold text-center py-1.5 rounded-lg"
          :class="day === todayWeekday
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
            : 'text-slate-500 dark:text-slate-400'"
        >
          {{ day }}
        </div>
      </div>

      <!-- 固定时段行 -->
      <div
        v-for="slotRow in slots"
        :key="slotRow.id"
        class="grid gap-1 mb-1"
        style="grid-template-columns: 64px repeat(7, 1fr)"
      >
        <!-- 时段标签 -->
        <div class="flex flex-col items-center justify-center text-[10px] text-slate-400 dark:text-slate-500 py-1">
          <span class="font-medium">{{ slotRow.start }}</span>
          <span>{{ slotRow.end }}</span>
        </div>
        <!-- 每天的格子 -->
        <div
          v-for="day in weekdays"
          :key="`${slotRow.id}-${day}`"
          :data-cell-weekday="day"
          :data-cell-slot-start="slotRow.start"
          class="schedule-cell min-h-[56px] rounded-lg border border-dashed border-slate-200 dark:border-slate-700 cursor-pointer transition-colors hover:border-indigo-300 dark:hover:border-indigo-700 p-1"
          :class="isConflictCell(day, slotRow.start) ? 'schedule-cell-conflict border-rose-400' : ''"
          @click="onCellClick(day, slotRow)"
        >
          <ScheduleCard
            v-for="item in getCellItems(day, slotRow)"
            :key="item.id"
            :item="item"
            :color-class="getColorClass(item.course)"
            @click="onCardClick"
            @drop="onCardDrop"
            @record="onCardRecord"
          />
        </div>
      </div>

      <!-- 其他时段行（排课项不在固定时段内时显示） -->
      <div v-if="hasOtherSlotItems" class="grid gap-1 mb-1" style="grid-template-columns: 64px repeat(7, 1fr)">
        <div class="flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-500 py-1">
          其他
        </div>
        <div
          v-for="day in weekdays"
          :key="`other-${day}`"
          :data-cell-weekday="day"
          data-cell-slot-start="__other__"
          class="schedule-cell min-h-[56px] rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-1"
          @click="onCellClick(day, null)"
        >
          <ScheduleCard
            v-for="item in getCellItems(day, null)"
            :key="item.id"
            :item="item"
            :color-class="getColorClass(item.course)"
            @click="onCardClick"
            @drop="onCardDrop"
            @record="onCardRecord"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schedule-cell {
  touch-action: pan-y;
}
</style>
