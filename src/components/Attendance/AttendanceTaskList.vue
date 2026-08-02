<script setup>
import { computed } from 'vue';
import { ATTENDANCE_THRESHOLD_DEFAULT } from '../../utils/scheduleConstants';
import { slotStartMinutes, formatSlot } from '../../composables/useDatabase';

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  warningStudents: { type: Array, default: () => [] },
  hourAccounts: { type: Array, default: () => [] },
});

const emit = defineEmits(['start-checkin']);

/** 按时段排序任务 */
const sortedTasks = computed(() => {
  return props.tasks.slice().sort((a, b) => {
    return slotStartMinutes(a.slot) - slotStartMinutes(b.slot);
  });
});

/** 获取任务的待签到人数 */
function getPendingCount(task) {
  if (!task.existingRecord) return task.studentGroup.length;
  const checked = new Set(task.existingRecord.records.map((r) => r.studentName));
  return task.studentGroup.filter((n) => !checked.has(n)).length;
}

/** 获取任务的预警人数 */
function getWarningCount(task) {
  return task.studentGroup.filter((name) => {
    return props.warningStudents.some(
      (w) => w.studentName === name && w.course === task.course,
    );
  }).length;
}

/** 获取学生剩余课时 */
function getRemainingHours(studentName, course) {
  const account = props.hourAccounts.find(
    (a) => a.studentName === studentName && a.course === course,
  );
  return account ? account.remainingHours : null;
}

function displaySlot(slot) {
  return formatSlot(slot);
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="task in sortedTasks"
      :key="task.scheduleItemId"
      class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 shadow-sm"
    >
      <!-- 时段 + 课程 -->
      <div class="flex items-start justify-between mb-2">
        <div>
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-bold text-slate-800 dark:text-slate-200">{{ task.course }}</span>
            <span
              v-if="task.existingRecord"
              class="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
            >
              ✓ 已考勤
            </span>
          </div>
          <div class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {{ displaySlot(task.slot) }}
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-500 dark:text-slate-400">{{ task.teacher || '未指定' }}</div>
          <div v-if="task.classroom" class="text-xs text-slate-400 dark:text-slate-500">{{ task.classroom }}</div>
        </div>
      </div>

      <!-- 学生信息 -->
      <div class="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-2.5">
        <span>学生 {{ task.studentGroup.length }} 人</span>
        <span class="text-slate-300 dark:text-slate-600">|</span>
        <span :class="getPendingCount(task) > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-emerald-600 dark:text-emerald-400'">
          待签到 {{ getPendingCount(task) }}
        </span>
        <span v-if="getWarningCount(task) > 0" class="text-rose-500 dark:text-rose-400 font-medium">
          ⚠ {{ getWarningCount(task) }} 人课时不足
        </span>
      </div>

      <!-- 开始签到按钮 -->
      <button
        class="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white active:bg-indigo-700 transition-colors"
        @click="emit('start-checkin', task)"
      >
        {{ task.existingRecord ? '继续考勤' : '开始签到' }}
      </button>
    </div>

    <!-- 空状态 -->
    <div v-if="!sortedTasks.length" class="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
      <p class="text-sm text-slate-400 dark:text-slate-500">今日暂无考勤任务</p>
      <p class="text-xs text-slate-300 dark:text-slate-600 mt-1">请先在排课模块安排今日课程</p>
    </div>
  </div>
</template>
