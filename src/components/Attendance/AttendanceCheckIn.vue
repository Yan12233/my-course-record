<script setup>
import { ref, computed, watch } from 'vue';
import { useAttendanceStore } from '../../stores/attendance';
import { useUiStore } from '../../stores/ui';
import { ATTENDANCE_THRESHOLD_DEFAULT } from '../../utils/scheduleConstants';
import { formatSlot } from '../../composables/useDatabase';

const props = defineProps({
  visible: { type: Boolean, default: false },
  task: { type: Object, default: null },
  hourAccounts: { type: Array, default: () => [] },
  classHours: { type: Number, default: 2 },
});

const emit = defineEmits(['close', 'saved']);

const attendanceStore = useAttendanceStore();
const ui = useUiStore();

// ── 首次签到弹窗 ──
const showInitHoursModal = ref(false);
const initHoursStudent = ref('');
const initHoursValue = ref('');

// ── 获取学生考勤状态 ──
function getStudentStatus(studentName) {
  if (!props.task?.existingRecord) return null;
  const rec = props.task.existingRecord.records.find((r) => r.studentName === studentName);
  return rec ? rec.status : null;
}

function getStudentCheckedAt(studentName) {
  if (!props.task?.existingRecord) return '';
  const rec = props.task.existingRecord.records.find((r) => r.studentName === studentName);
  return rec ? rec.checkedAt : '';
}

// ── 获取剩余课时 ──
function getRemainingHours(studentName) {
  const account = props.hourAccounts.find(
    (a) => a.studentName === studentName && a.course === props.task?.course,
  );
  return account ? account.remainingHours : null;
}

function isWarning(studentName) {
  const remaining = getRemainingHours(studentName);
  return remaining !== null && remaining <= ATTENDANCE_THRESHOLD_DEFAULT;
}

// ── 签到操作 ──
async function onCheckIn(studentName, status) {
  if (!props.task) return;

  // 检查是否首次签到（无课时账户）
  if (status === 'present') {
    const remaining = getRemainingHours(studentName);
    if (remaining === null) {
      // 首次签到，弹窗输入初始课时
      initHoursStudent.value = studentName;
      initHoursValue.value = '';
      showInitHoursModal.value = true;
      // 先不签到，等用户输入课时后再签到
      return;
    }
  }

  await attendanceStore.checkIn(props.task.scheduleItemId, studentName, status);
}

async function onConfirmInitHours() {
  const hours = parseFloat(initHoursValue.value);
  if (Number.isNaN(hours) || hours <= 0) {
    ui.showToast('请输入有效的课时数', 'error');
    return;
  }

  // 充值初始课时
  await attendanceStore.rechargeStudent(
    initHoursStudent.value,
    props.task.course,
    hours,
    '初始充值',
  );
  ui.showToast(`已为 ${initHoursStudent.value} 充值 ${hours} 课时`, 'success');

  // 执行签到
  await attendanceStore.checkIn(props.task.scheduleItemId, initHoursStudent.value, 'present');

  showInitHoursModal.value = false;
  initHoursStudent.value = '';
  initHoursValue.value = '';
}

function onCancelInitHours() {
  showInitHoursModal.value = false;
  initHoursStudent.value = '';
  initHoursValue.value = '';
}

// ── 全部签到 ──
async function onCheckInAll() {
  if (!props.task) return;
  // 检查所有学生是否都有课时账户
  for (const name of props.task.studentGroup) {
    if (getRemainingHours(name) === null) {
      // 首次签到，先充值 0 课时（之后可手动充值）
      await attendanceStore.rechargeStudent(name, props.task.course, 0, '初始化账户');
    }
  }
  await attendanceStore.checkInAll(props.task.scheduleItemId);
  ui.showToast('已全部签到', 'success');
}

// ── 保存考勤 ──
const saving = ref(false);

async function onSave() {
  if (!props.task) return;
  saving.value = true;
  try {
    await attendanceStore.saveAttendance(props.task.scheduleItemId, props.classHours);
    emit('saved');
  } catch (err) {
    ui.showToast('保存考勤失败', 'error');
  } finally {
    saving.value = false;
  }
}

// ── 排序学生（已签到的排后面） ──
const sortedStudents = computed(() => {
  if (!props.task) return [];
  return props.task.studentGroup.slice().sort((a, b) => {
    const sa = getStudentStatus(a);
    const sb = getStudentStatus(b);
    if (sa && !sb) return 1;
    if (!sa && sb) return -1;
    return 0;
  });
});

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function displaySlot(slot) {
  return formatSlot(slot);
}
</script>

<template>
  <div
    class="fixed inset-0 z-[180] flex items-stretch justify-center bg-slate-900/65"
    :class="visible ? '' : 'hidden'"
    @click="emit('close')"
  >
    <div
      class="absolute bottom-0 w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-white dark:bg-slate-800 shadow-2xl"
      @click.stop
    >
      <!-- Header -->
      <div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
        <div class="flex items-center gap-2">
          <button class="text-slate-400 hover:text-slate-600" @click="emit('close')">◁</button>
          <div>
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">{{ task?.course }} 考勤</h2>
            <p class="text-xs text-slate-400 dark:text-slate-500">{{ displaySlot(task?.slot) }}</p>
          </div>
        </div>
        <button
          class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white active:bg-emerald-700"
          @click="onCheckInAll"
        >
          全部签到
        </button>
      </div>

      <!-- 学生列表 -->
      <div class="px-4 py-3 space-y-2">
        <div
          v-for="name in sortedStudents"
          :key="name"
          class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span
                class="w-2 h-2 rounded-full"
                :class="{
                  'bg-slate-300 dark:bg-slate-600': !getStudentStatus(name),
                  'bg-emerald-500': getStudentStatus(name) === 'present',
                  'bg-amber-500': getStudentStatus(name) === 'leave',
                  'bg-rose-500': getStudentStatus(name) === 'absent',
                }"
              />
              <span class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ name }}</span>
              <span v-if="isWarning(name)" class="text-xs text-rose-500">⚠</span>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="getRemainingHours(name) !== null" class="text-xs text-slate-400 dark:text-slate-500">
                剩余 {{ getRemainingHours(name) }}h
              </span>
              <span v-if="getStudentCheckedAt(name)" class="text-[10px] text-slate-400 dark:text-slate-500">
                {{ formatTime(getStudentCheckedAt(name)) }}
              </span>
            </div>
          </div>

          <!-- 三态按钮 -->
          <div class="flex gap-1.5">
            <button
              type="button"
              class="flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors"
              :class="getStudentStatus(name) === 'present'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'"
              @click="onCheckIn(name, 'present')"
            >
              签到
            </button>
            <button
              type="button"
              class="flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors"
              :class="getStudentStatus(name) === 'leave'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'"
              @click="onCheckIn(name, 'leave')"
            >
              请假
            </button>
            <button
              type="button"
              class="flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors"
              :class="getStudentStatus(name) === 'absent'
                ? 'bg-rose-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'"
              @click="onCheckIn(name, 'absent')"
            >
              缺勤
            </button>
          </div>
        </div>

        <p v-if="!sortedStudents.length" class="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
          该课程暂无学生名单，请在排课中添加学生
        </p>
      </div>

      <!-- 底部保存按钮 -->
      <div class="sticky bottom-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
        <button
          class="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white active:bg-indigo-700 transition-colors disabled:opacity-50"
          :disabled="saving"
          @click="onSave"
        >
          {{ saving ? '保存中…' : '保存考勤' }}
        </button>
      </div>

      <!-- 首次签到弹窗 -->
      <div
        v-if="showInitHoursModal"
        class="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/50 p-4"
        @click="onCancelInitHours"
      >
        <div
          class="w-full max-w-xs rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-2xl"
          @click.stop
        >
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-1">初始化课时</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
            {{ initHoursStudent }} 首次签到，请输入初始课时数
          </p>
          <input
            v-model="initHoursValue"
            type="number"
            min="0"
            step="0.5"
            placeholder="如 20"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
            @keyup.enter="onConfirmInitHours"
          />
          <div class="mt-3 flex gap-2">
            <button
              class="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 py-2 text-sm text-slate-600 dark:text-slate-400"
              @click="onCancelInitHours"
            >
              取消
            </button>
            <button
              class="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white"
              @click="onConfirmInitHours"
            >
              确认
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
