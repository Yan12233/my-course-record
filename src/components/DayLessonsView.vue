<script setup>
import { computed, ref } from 'vue';
import { formatLessonFeeBreakdown } from '../utils/lessonFee';
import { getIsoDateWeekday } from '../utils/lessonDate';
import { formatSlot, slotStartMinutes } from '../composables/useDatabase';

const props = defineProps({
  isoDate: { type: String, required: true },
  records: { type: Array, default: () => [] },
  daySummary: {
    type: Object,
    default: () => ({ totalHours: 0, totalFee: 0, count: 0 }),
  },
  timetableItems: { type: Array, default: () => [] },
});

const emit = defineEmits(['back', 'add-lesson', 'edit-record', 'open-record', 'open-student', 'add-from-timetable', 'batch-delete', 'batch-export']);

const dateLabel = computed(() => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(props.isoDate || '');
  if (!m) return props.isoDate;
  return `${m[1]}年${parseInt(m[2], 10)}月${parseInt(m[3], 10)}日`;
});

/* ───── 今日课表 ───── */
const dayTimetableItems = computed(() => {
  const weekday = getIsoDateWeekday(props.isoDate);
  if (!weekday || !Array.isArray(props.timetableItems)) return [];
  return props.timetableItems
    .filter(it => it && it.weekday === weekday)
    .slice()
    .sort((a, b) => slotStartMinutes(a.slot) - slotStartMinutes(b.slot));
});

function displaySlot(item) {
  return formatSlot(item.slot);
}

/* ───── 批量选择 ───── */
const batchMode = ref(false);
const selectedIds = ref(new Set());

function toggleBatchMode() {
  batchMode.value = !batchMode.value;
  if (!batchMode.value) selectedIds.value = new Set();
}

function toggleSelectItem(id) {
  if (!id) return;
  const s = selectedIds.value;
  if (s.has(id)) s.delete(id);
  else s.add(id);
}

function isSelected(id) {
  return selectedIds.value.has(id);
}

function exitBatch() {
  batchMode.value = false;
  selectedIds.value = new Set();
}
</script>

<template>
  <section class="space-y-4">
    <header class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 active:bg-slate-50"
        @click="emit('back')"
      >
        ‹ 月历
      </button>
      <div class="min-w-0 flex-1 text-center">
        <h2 class="text-lg font-semibold text-slate-900">{{ dateLabel }}</h2>
        <p v-if="!batchMode" class="text-xs text-slate-500">
          共 {{ daySummary.count }} 节 · 课时 {{ daySummary.totalHours }} · 费用 ¥{{ daySummary.totalFee }}
        </p>
        <p v-else class="text-xs text-indigo-600 font-medium">
          已选 {{ selectedIds.size }} 条
        </p>
      </div>
      <button
        v-if="batchMode"
        type="button"
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 active:bg-slate-50"
        @click="exitBatch"
      >
        取消
      </button>
      <div v-else class="w-[52px]" aria-hidden="true" />
    </header>

    <!-- 批量操作工具栏 -->
    <div v-if="batchMode && selectedIds.size" class="flex gap-2">
      <button
        type="button"
        class="flex-1 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white active:bg-rose-700"
        @click="$emit('batch-delete', Array.from(selectedIds)); exitBatch()"
      >
        批量删除（{{ selectedIds.size }}）
      </button>
      <button
        type="button"
        class="flex-1 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white active:bg-emerald-700"
        @click="$emit('batch-export', Array.from(selectedIds)); exitBatch()"
      >
        导出选中
      </button>
    </div>

    <!-- 非批量模式 -->
    <template v-if="!batchMode">
      <button
        type="button"
        class="w-full rounded-2xl bg-indigo-600 px-4 py-3.5 text-base font-semibold text-white shadow-md shadow-indigo-600/25 active:bg-indigo-700"
        @click="emit('add-lesson')"
      >
        + 添加本日课程
      </button>

      <!-- ⏰ 今日课表联动 -->
      <div v-if="dayTimetableItems.length" class="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-semibold text-indigo-800">📅 今日课表</p>
          <span class="text-xs text-indigo-500">{{ dayTimetableItems.length }} 项</span>
        </div>
        <div class="space-y-1.5">
          <button
            v-for="item in dayTimetableItems"
            :key="item.id"
            type="button"
            class="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left text-sm shadow-sm active:bg-indigo-50 transition-colors"
            @click="$emit('add-from-timetable', item)"
          >
            <span class="shrink-0 rounded-lg bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
              {{ displaySlot(item) }}
            </span>
            <span class="font-medium text-slate-800">{{ item.course }}</span>
            <span
              class="ml-1 inline-block rounded px-1 text-[10px] font-medium"
              :class="item.lessonType === 'retail'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-indigo-50 text-indigo-500'"
            >
              {{ item.lessonType === 'retail' ? '零售' : '常规' }}
            </span>
            <span class="ml-auto text-xs text-indigo-500">一键录入 →</span>
          </button>
        </div>
      </div>

      <!-- 批量入口 -->
      <div v-if="records.length > 1" class="text-right">
        <button
          type="button"
          class="text-xs font-medium text-slate-500 active:text-slate-700"
          @click="toggleBatchMode"
        >
          批量操作
        </button>
      </div>
    </template>

    <!-- 记录列表（含批量选择框） -->
    <ul v-if="records.length" class="space-y-2">
      <li
        v-for="item in records"
        :key="item.id"
        class="rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors"
        :class="batchMode ? '' : 'cursor-pointer active:bg-indigo-50/30'"
        @click="batchMode ? toggleSelectItem(item.id) : $emit('open-record', item)"
      >
        <div class="p-3">
          <div class="flex gap-3">
            <!-- 批量选择框 -->
            <div v-if="batchMode" class="flex items-center">
              <div
                class="h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors"
                :class="isSelected(item.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'"
              >
                <span v-if="isSelected(item.id)" class="text-white text-xs font-bold">✓</span>
              </div>
            </div>
            <div
              v-if="item.imageBase64"
              class="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50"
            >
              <img :src="item.imageBase64" alt="" class="h-full w-full object-cover" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-slate-900 truncate">{{ item.course || '（未填写课程）' }}</p>
              <p class="text-xs text-slate-500 truncate">{{ item.lessonSchedule || '未填写时间段' }}</p>
              <p v-if="formatLessonFeeBreakdown(item)" class="text-xs text-emerald-700 mt-0.5">
                {{ formatLessonFeeBreakdown(item) }}
              </p>
              <div class="flex flex-wrap items-center gap-1 mt-1">
                <span
                  class="inline-block rounded-md px-1.5 py-0.5 text-xs font-medium"
                  :class="item.lessonType === 'retail' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'"
                >
                  {{ item.lessonType === 'retail' ? '零售课' : '常规课' }}
                </span>
                <span
                  v-for="s in (item.students || [])"
                  :key="s.name || s"
                  class="inline-block rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700 cursor-pointer active:bg-indigo-100"
                  @click.stop="!batchMode && $emit('open-student', s.name || s)"
                >
                  {{ s.name || s }}
                </span>
              </div>
            </div>
          </div>
          <div v-if="!batchMode" class="mt-2 flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-xs font-medium text-indigo-800 active:bg-indigo-100"
              @click.stop="$emit('edit-record', item)"
            >
              编辑
            </button>
          </div>
        </div>
      </li>
    </ul>
    <p v-else class="text-center text-sm text-slate-400 py-8">这一天还没有记录，点击上方按钮添加</p>
  </section>
</template>
