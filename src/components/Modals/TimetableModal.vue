<script setup>
import { computed } from 'vue';
import { formatSlot, slotStartMinutes } from '../../composables/useDatabase';

const props = defineProps({
  visible: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  weekdays: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'go-to-schedule']);

/* 排序：按 slotStartMinutes 数值排序，无法解析的排最后 */
function sortedItemsForDay(day) {
  return props.items
    .filter((x) => x.weekday === day)
    .slice()
    .sort((a, b) => slotStartMinutes(a.slot) - slotStartMinutes(b.slot));
}

function displaySlot(item) {
  return formatSlot(item.slot);
}

/** 跳转到排课管理模块 */
function goToSchedule() {
  emit('go-to-schedule');
}

/** 统计今日课程数 */
const todayCount = computed(() => {
  const d = new Date().getDay();
  const today = props.weekdays[(d + 6) % 7];
  return props.items.filter((x) => x.weekday === today).length;
});
</script>

<template>
  <div
    class="fixed inset-0 z-[170] flex items-stretch justify-center bg-slate-900/65 dark:bg-slate-950/80 p-0 sm:p-4"
    :class="visible ? '' : 'hidden'"
    @click="emit('close')"
  >
    <div
      class="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white dark:bg-slate-900 shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl"
      role="dialog"
      aria-modal="true"
      @click.stop
    >
      <!-- 头部 -->
      <div class="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white">我的课表</h2>
          <span
            v-if="todayCount > 0"
            class="rounded-full bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300"
          >
            今日 {{ todayCount }} 节
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white active:bg-indigo-700 transition-colors"
            @click="goToSchedule"
          >
            前往排课管理
          </button>
          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- 课表列表 -->
      <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          <section
            v-for="day in weekdays"
            :key="day"
            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5"
          >
            <h3 class="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{{ day }}</h3>
            <template v-if="items.some((it) => it.weekday === day)">
              <div
                v-for="it in sortedItemsForDay(day)"
                :key="it.id"
                class="mb-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-2 py-1.5 last:mb-0"
              >
                <p class="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {{ displaySlot(it) }} · {{ it.course }}
                  <span
                    class="ml-1 inline-block rounded px-1 text-[10px] font-medium"
                    :class="it.lessonType === 'retail'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'"
                  >
                    {{ it.lessonType === 'retail' ? '零售' : '常规' }}
                  </span>
                  <span
                    v-if="it.templateId"
                    class="ml-1 inline-block rounded bg-emerald-100 dark:bg-emerald-900 px-1 text-[10px] text-emerald-700 dark:text-emerald-300"
                  >
                    模板
                  </span>
                </p>
                <!-- 教师 / 教室信息 -->
                <div class="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span v-if="it.teacher" class="inline-flex items-center gap-0.5">
                    <span class="text-slate-400 dark:text-slate-500">👨‍🏫</span>{{ it.teacher }}
                  </span>
                  <span v-if="it.classroom" class="inline-flex items-center gap-0.5">
                    <span class="text-slate-400 dark:text-slate-500">📍</span>{{ it.classroom }}
                  </span>
                  <span
                    v-if="Array.isArray(it.studentGroup) && it.studentGroup.length"
                    class="inline-flex items-center gap-0.5"
                  >
                    <span class="text-slate-400 dark:text-slate-500">👥</span>{{ it.studentGroup.length }}人
                  </span>
                </div>
              </div>
            </template>
            <p v-else class="text-xs text-slate-400 dark:text-slate-500">暂无安排</p>
          </section>
        </div>

        <!-- 底部操作提示 -->
        <div class="mt-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 px-4 py-3 text-center">
          <p class="text-xs text-indigo-600 dark:text-indigo-400">
            💡 排课、调课、冲突检测等功能已迁移至排课管理模块
          </p>
          <button
            type="button"
            class="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white active:bg-indigo-700 transition-colors"
            @click="goToSchedule"
          >
            前往排课管理 →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
