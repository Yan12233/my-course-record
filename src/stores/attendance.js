/**
 * 考勤 Pinia Store
 *
 * 响应式管理考勤记录、课时账户、当日任务，
 * 提供签到、保存考勤、课时扣减、充值等 actions
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAttendance } from '../composables/useAttendance';
import { useScheduleStore } from './schedule';
import { useUiStore } from './ui';
import { TIMETABLE_WEEKDAYS, generateRecordId } from '../composables/useDatabase';
import { ATTENDANCE_THRESHOLD_DEFAULT } from '../utils/scheduleConstants';

export const useAttendanceStore = defineStore('attendance', () => {
  // ── State ──
  const records = ref([]);
  const hourAccounts = ref([]);
  const todayTasks = ref([]);
  const loaded = ref(false);

  // ── Getters ──

  /** 预警学生列表（剩余课时 ≤ 阈值） */
  const warningStudents = computed(() => {
    return hourAccounts.value
      .filter((a) => a.remainingHours <= ATTENDANCE_THRESHOLD_DEFAULT)
      .map((a) => ({
        studentName: a.studentName,
        course: a.course,
        remainingHours: a.remainingHours,
      }));
  });

  /** 今日统计 */
  const todayStats = computed(() => {
    const todayIso = formatIsoDate(new Date());
    const todayRecords = records.value.filter((r) => r.date === todayIso);

    let totalStudents = 0;
    let presentStudents = 0;
    for (const r of todayRecords) {
      for (const s of r.records) {
        totalStudents++;
        if (s.status === 'present') presentStudents++;
      }
    }
    const attendanceRate = totalStudents > 0
      ? Math.round((presentStudents / totalStudents) * 100)
      : 100;

    // 消耗课时：从 todayTasks 中查找模板的 classHours
    let totalConsumedHours = 0;
    for (const r of todayRecords) {
      for (const s of r.records) {
        if (s.status === 'present') {
          totalConsumedHours += 2; // 默认 2 课时，精确值需从模板获取
        }
      }
    }

    const warningCount = warningStudents.value.length;

    return { attendanceRate, totalConsumedHours, warningCount };
  });

  // ── Actions ──

  const attendanceApi = useAttendance();

  /** 加载考勤记录和课时账户 */
  async function load() {
    const [recs, accounts] = await Promise.all([
      attendanceApi.getAttendanceRecords(),
      attendanceApi.getHourAccounts(),
    ]);
    records.value = recs;
    hourAccounts.value = accounts;
    loaded.value = true;
  }

  /**
   * 从 scheduleStore.items 生成当日考勤任务
   */
  async function generateTodayTasks() {
    const scheduleStore = useScheduleStore();
    if (!scheduleStore.loaded) {
      await scheduleStore.load();
    }
    const tasks = await attendanceApi.generateTodayTasks(scheduleStore.items);
    todayTasks.value = tasks;
  }

  /**
   * 签到单个学生（更新内存态 todayTasks）
   * @param {string} scheduleItemId
   * @param {string} studentName
   * @param {'present'|'leave'|'absent'} status
   */
  async function checkIn(scheduleItemId, studentName, status) {
    const task = todayTasks.value.find((t) => t.scheduleItemId === scheduleItemId);
    if (!task) return;

    // 初始化或更新 existingRecord
    if (!task.existingRecord) {
      task.existingRecord = {
        id: generateRecordId(),
        scheduleItemId,
        date: formatIsoDate(new Date()),
        course: task.course,
        teacher: task.teacher,
        records: [],
        updatedAt: Date.now(),
      };
    }

    const rec = task.existingRecord;
    const existing = rec.records.find((r) => r.studentName === studentName);
    const checkedAt = new Date().toISOString();
    if (existing) {
      existing.status = status;
      existing.checkedAt = checkedAt;
    } else {
      rec.records.push({ studentName, status, checkedAt });
    }
    rec.updatedAt = Date.now();
  }

  /**
   * 全部签到（将所有未标记学生设为 present）
   * @param {string} scheduleItemId
   */
  async function checkInAll(scheduleItemId) {
    const task = todayTasks.value.find((t) => t.scheduleItemId === scheduleItemId);
    if (!task) return;

    if (!task.existingRecord) {
      task.existingRecord = {
        id: generateRecordId(),
        scheduleItemId,
        date: formatIsoDate(new Date()),
        course: task.course,
        teacher: task.teacher,
        records: [],
        updatedAt: Date.now(),
      };
    }

    const rec = task.existingRecord;
    const checkedAt = new Date().toISOString();
    for (const studentName of task.studentGroup) {
      const existing = rec.records.find((r) => r.studentName === studentName);
      if (!existing) {
        rec.records.push({ studentName, status: 'present', checkedAt });
      }
    }
    rec.updatedAt = Date.now();
  }

  /**
   * 保存考勤（持久化 + 批量扣减课时）
   * @param {string} scheduleItemId
   * @param {number} classHours - 每次课的课时数
   */
  async function saveAttendance(scheduleItemId, classHours = 2) {
    const task = todayTasks.value.find((t) => t.scheduleItemId === scheduleItemId);
    if (!task || !task.existingRecord) return;

    const ui = useUiStore();

    // 保存考勤记录
    await attendanceApi.saveAttendanceRecord(task.existingRecord);

    // 批量扣减课时（仅 present 状态扣减）
    for (const s of task.existingRecord.records) {
      if (s.status === 'present') {
        await attendanceApi.deductHours(s.studentName, task.course, classHours);
      }
    }

    // 刷新数据
    await load();
    await generateTodayTasks();

    ui.showToast('考勤已保存，课时已扣减', 'success');
  }

  /**
   * 给学生充值课时
   * @param {string} studentName
   * @param {string} course
   * @param {number} hours
   * @param {string} note
   */
  async function rechargeStudent(studentName, course, hours, note) {
    await attendanceApi.rechargeHours(studentName, course, hours, note);
    // 刷新课时账户
    hourAccounts.value = await attendanceApi.getHourAccounts();
  }

  /* ─── 工具函数 ─── */

  function formatIsoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return {
    records,
    hourAccounts,
    todayTasks,
    loaded,
    warningStudents,
    todayStats,
    load,
    generateTodayTasks,
    checkIn,
    checkInAll,
    saveAttendance,
    rechargeStudent,
  };
});
