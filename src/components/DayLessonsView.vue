<script setup>
import { computed } from 'vue';
import { formatLessonFeeBreakdown } from '../utils/lessonFee';

const props = defineProps({
  isoDate: { type: String, required: true },
  records: { type: Array, default: () => [] },
  daySummary: {
    type: Object,
    default: () => ({ totalHours: 0, totalFee: 0, count: 0 }),
  },
});

const emit = defineEmits(['back', 'add-lesson', 'edit-record', 'open-record']);

const dateLabel = computed(() => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(props.isoDate || '');
  if (!m) return props.isoDate;
  return `${m[1]}年${parseInt(m[2], 10)}月${parseInt(m[3], 10)}日`;
});
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
        <p class="text-xs text-slate-500">
          共 {{ daySummary.count }} 节 · 课时 {{ daySummary.totalHours }} · 费用 ¥{{ daySummary.totalFee }}
        </p>
      </div>
      <div class="w-[52px]" aria-hidden="true" />
    </header>

    <button
      type="button"
      class="w-full rounded-2xl bg-indigo-600 px-4 py-3.5 text-base font-semibold text-white shadow-md shadow-indigo-600/25 active:bg-indigo-700"
      @click="emit('add-lesson')"
    >
      + 添加本日课程
    </button>

    <ul v-if="records.length" class="space-y-2">
      <li
        v-for="item in records"
        :key="item.id"
        class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        <div class="flex gap-3">
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
            <span
              class="inline-block mt-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
              :class="item.lessonType === 'retail' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'"
            >
              {{ item.lessonType === 'retail' ? '零售课' : '常规课' }}
            </span>
          </div>
        </div>
        <div class="mt-2 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-xs font-medium text-indigo-800 active:bg-indigo-100"
            @click="emit('edit-record', item)"
          >
            编辑
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 active:bg-slate-50"
            @click="emit('open-record', item)"
          >
            详情
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="text-center text-sm text-slate-400 py-8">这一天还没有记录，点击上方按钮添加</p>
  </section>
</template>
