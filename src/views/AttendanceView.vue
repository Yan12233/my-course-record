<script setup>
import { ref, onMounted, computed } from 'vue';
import AttendanceTaskList from '../components/Attendance/AttendanceTaskList.vue';
import AttendanceCheckIn from '../components/Attendance/AttendanceCheckIn.vue';
import AttendanceDashboard from '../components/Attendance/AttendanceDashboard.vue';
import { useAttendanceStore } from '../stores/attendance';
import { useDatabase } from '../composables/useDatabase';

const attendanceStore = useAttendanceStore();
const { getLessonTemplates } = useDatabase();

// ── 签到弹窗状态 ──
const checkInVisible = ref(false);
const currentTask = ref(null);

// ── 模板课时映射 ──
const templateClassHoursMap = ref({});

// ── 加载状态 ──
const loading = ref(true);

const todayDisplay = computed(() => {
  const d = new Date();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
});

onMounted(async () => {
  loading.value = true;
  try {
    await attendanceStore.load();
    await attendanceStore.generateTodayTasks();

    // 加载模板以获取 classHours
    const templates = await getLessonTemplates();
    const map = {};
    for (const tpl of templates) {
      map[tpl.id] = tpl.classHours || 2;
    }
    templateClassHoursMap.value = map;
  } catch (err) {
    // 静默
  } finally {
    loading.value = false;
  }
});

/** 开始签到 */
function onStartCheckIn(task) {
  currentTask.value = task;
  checkInVisible.value = true;
}

/** 签到保存完成 */
function onSaved() {
  checkInVisible.value = false;
  currentTask.value = null;
}

/** 获取当前任务的课时数 */
function getCurrentTaskClassHours() {
  if (!currentTask.value?.templateId) return 2;
  return templateClassHoursMap.value[currentTask.value.templateId] || 2;
}
</script>

<template>
  <div class="px-4 py-3 pb-6">
    <!-- 加载中 -->
    <div v-if="loading" class="space-y-3 animate-pulse">
      <div class="h-8 rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div class="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800" />
      <div class="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800" />
    </div>

    <template v-else>
      <!-- 日期标题 -->
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-300">
          📋 今日考勤
        </h2>
        <span class="text-xs text-slate-400 dark:text-slate-500">{{ todayDisplay }}</span>
      </div>

      <!-- 考勤看板 -->
      <div class="mb-3">
        <AttendanceDashboard :today-stats="attendanceStore.todayStats" />
      </div>

      <!-- 考勤任务列表 -->
      <AttendanceTaskList
        :tasks="attendanceStore.todayTasks"
        :warning-students="attendanceStore.warningStudents"
        :hour-accounts="attendanceStore.hourAccounts"
        @start-checkin="onStartCheckIn"
      />

      <!-- 预警学生列表 -->
      <div v-if="attendanceStore.warningStudents.length" class="mt-4">
        <h3 class="text-xs font-semibold text-rose-500 dark:text-rose-400 mb-2">⚠ 课时预警</h3>
        <div class="space-y-1.5">
          <div
            v-for="(w, idx) in attendanceStore.warningStudents"
            :key="idx"
            class="flex items-center justify-between rounded-xl bg-rose-50 dark:bg-rose-950/20 px-3 py-2"
          >
            <span class="text-sm text-slate-700 dark:text-slate-300">{{ w.studentName }}</span>
            <span class="text-xs text-slate-400 dark:text-slate-500">{{ w.course }}</span>
            <span class="text-xs font-medium text-rose-500">剩余 {{ w.remainingHours }}h</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 签到弹窗 -->
    <AttendanceCheckIn
      :visible="checkInVisible"
      :task="currentTask"
      :hour-accounts="attendanceStore.hourAccounts"
      :class-hours="getCurrentTaskClassHours()"
      @close="checkInVisible = false"
      @saved="onSaved"
    />
  </div>
</template>
