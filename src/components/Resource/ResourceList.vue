<script setup>
import { RESOURCE_TYPES } from '../../utils/scheduleConstants';

const props = defineProps({
  items: { type: Array, default: () => [] },
});

const emit = defineEmits(['edit', 'delete', 'open']);

const TYPE_LABELS = RESOURCE_TYPES.reduce((map, t) => {
  map[t.value] = t.label;
  return map;
}, {});

const TYPE_COLORS = {
  lesson_plan: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  courseware: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  exercise: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  other: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

function getTypeLabel(type) {
  return TYPE_LABELS[type] || '其他';
}

function getTypeColor(type) {
  return TYPE_COLORS[type] || TYPE_COLORS.other;
}

function onOpen(item) {
  emit('open', item);
}
</script>

<template>
  <div class="space-y-2.5">
    <div
      v-for="item in items"
      :key="item.id"
      class="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 shadow-sm transition-all hover:shadow-md"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0" @click="onOpen(item)">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{{ item.title }}</span>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <span v-if="item.subject" class="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
              {{ item.subject }}
            </span>
            <span v-if="item.grade" class="rounded-full bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
              {{ item.grade }}
            </span>
            <span :class="['rounded-full px-2 py-0.5 text-[10px] font-medium', getTypeColor(item.type)]">
              {{ getTypeLabel(item.type) }}
            </span>
          </div>
          <p v-if="item.description" class="text-xs text-slate-400 dark:text-slate-500 mt-1.5 line-clamp-2">{{ item.description }}</p>
        </div>

        <!-- 操作按钮 -->
        <div class="flex flex-col gap-1 flex-shrink-0">
          <button
            class="rounded-lg border border-slate-200 dark:border-slate-600 px-2 py-1 text-[10px] text-slate-500 dark:text-slate-400 active:bg-slate-50 dark:active:bg-slate-700"
            @click="onOpen(item)"
          >
            打开 →
          </button>
          <button
            class="rounded-lg border border-indigo-200 dark:border-indigo-700 px-2 py-1 text-[10px] text-indigo-600 dark:text-indigo-400 active:bg-indigo-50 dark:active:bg-indigo-900/30"
            @click="emit('edit', item)"
          >
            编辑
          </button>
          <button
            class="rounded-lg border border-rose-200 dark:border-rose-700 px-2 py-1 text-[10px] text-rose-600 dark:text-rose-400 active:bg-rose-50 dark:active:bg-rose-900/30"
            @click="emit('delete', item.id)"
          >
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!items.length" class="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
      <p class="text-sm text-slate-400 dark:text-slate-500">暂无资源</p>
      <p class="text-xs text-slate-300 dark:text-slate-600 mt-1">点击右上角「+」添加教案/课件</p>
    </div>
  </div>
</template>
