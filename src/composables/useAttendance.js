/**
 * 考勤数据层 Composable
 *
 * 提供 attendance_v1 / student_hour_accounts_v1 的 CRUD、
 * 考勤任务生成、签到保存、课时扣减/充值、预警检测、统计
 */
import { useDatabase } from './useDatabase';
import { TIMETABLE_WEEKDAYS } from './useDatabase';

export function useAttendance() {
  const {
    ensureConfigured,
    generateRecordId,
    sanitizeAttendanceRecord,
    getAttendanceRecords,
    setAttendanceRecords,
    sanitizeHourAccount,
    getHourAccounts,
    setHourAccounts,
  } = useDatabase();

  /* ─── 考勤记录 CRUD ─── */

  async function getRecords() {
    return getAttendanceRecords();
  }

  async function setRecords(list) {
    return setAttendanceRecords(list);
  }

  /**
   * 按日期获取考勤记录
   * @param {string} date - "YYYY-MM-DD"
   * @returns {Promise<object[]>}
   */
  async function getAttendanceByDate(date) {
    const records = await getAttendanceRecords();
    return records.filter((r) => r.date === date);
  }

  /**
   * 按排课项 ID + 日期获取考勤记录
   * @param {string} scheduleItemId
   * @param {string} date - "YYYY-MM-DD"
   * @returns {Promise<object|null>}
   */
  async function getAttendanceByScheduleItem(scheduleItemId, date) {
    const records = await getAttendanceRecords();
    return records.find((r) => r.scheduleItemId === scheduleItemId && r.date === date) || null;
  }

  /* ─── 课时账户 CRUD ─── */

  async function getAccounts() {
    return getHourAccounts();
  }

  async function setAccounts(list) {
    return setHourAccounts(list);
  }

  /**
   * 获取指定学生+课程的课时账户
   * @param {string} studentName
   * @param {string} course
   * @returns {Promise<object|null>}
   */
  async function getHourAccount(studentName, course) {
    const accounts = await getHourAccounts();
    return accounts.find(
      (a) => a.studentName === studentName && a.course === course,
    ) || null;
  }

  /* ─── 考勤任务生成 ─── */

  /**
   * 生成当日考勤任务
   * @param {object[]} scheduleItems - 排课项列表
   * @returns {Promise<object[]>} 考勤任务列表
   */
  async function generateTodayTasks(scheduleItems) {
    const today = new Date().getDay(); // 0=周日
    const weekday = TIMETABLE_WEEKDAYS[(today + 6) % 7];
    const todayIso = formatIsoDate(new Date());

    const matched = (scheduleItems || []).filter((it) => it.weekday === weekday);
    const tasks = [];
    for (const item of matched) {
      const existingRecord = await getAttendanceByScheduleItem(item.id, todayIso);
      tasks.push({
        scheduleItemId: item.id,
        course: item.course,
        teacher: item.teacher || '',
        classroom: item.classroom || '',
        slot: item.slot,
        studentGroup: Array.isArray(item.studentGroup) ? item.studentGroup : [],
        templateId: item.templateId || '',
        existingRecord: existingRecord || null,
      });
    }
    return tasks;
  }

  /* ─── 签到 + 课时扣减 ─── */

  /**
   * 保存考勤记录
   * @param {object} record - AttendanceRecord
   * @returns {Promise<object>}
   */
  async function saveAttendanceRecord(record) {
    const sanitized = sanitizeAttendanceRecord(record);
    if (!sanitized) throw new Error('考勤记录数据无效');
    const records = await getAttendanceRecords();
    // 替换同 scheduleItemId + date 的旧记录
    const filtered = records.filter(
      (r) => !(r.scheduleItemId === sanitized.scheduleItemId && r.date === sanitized.date),
    );
    filtered.push(sanitized);
    await setAttendanceRecords(filtered);
    return sanitized;
  }

  /**
   * 扣减课时
   * @param {string} studentName
   * @param {string} course
   * @param {number} hours
   * @returns {Promise<void>}
   */
  async function deductHours(studentName, course, hours) {
    const accounts = await getHourAccounts();
    let account = accounts.find(
      (a) => a.studentName === studentName && a.course === course,
    );
    if (!account) {
      // 自动创建账户，总课时默认 0
      account = {
        id: generateRecordId(),
        studentName,
        course,
        totalHours: 0,
        consumedHours: 0,
        remainingHours: 0,
        rechargeHistory: [],
      };
      accounts.push(account);
    }
    account.consumedHours = Math.round((account.consumedHours + hours) * 100) / 100;
    account.remainingHours = Math.max(0, Math.round((account.totalHours - account.consumedHours) * 100) / 100);
    await setHourAccounts(accounts);
  }

  /**
   * 充值课时
   * @param {string} studentName
   * @param {string} course
   * @param {number} hours
   * @param {string} note
   * @returns {Promise<void>}
   */
  async function rechargeHours(studentName, course, hours, note) {
    const accounts = await getHourAccounts();
    let account = accounts.find(
      (a) => a.studentName === studentName && a.course === course,
    );
    if (!account) {
      account = {
        id: generateRecordId(),
        studentName,
        course,
        totalHours: 0,
        consumedHours: 0,
        remainingHours: 0,
        rechargeHistory: [],
      };
      accounts.push(account);
    }
    account.totalHours = Math.round((account.totalHours + hours) * 100) / 100;
    account.remainingHours = Math.max(0, Math.round((account.totalHours - account.consumedHours) * 100) / 100);
    account.rechargeHistory.push({
      id: generateRecordId(),
      hours: Math.round(hours * 100) / 100,
      createdAt: Date.now(),
      note: String(note || '').trim().slice(0, 200),
    });
    await setHourAccounts(accounts);
  }

  /* ─── 预警 ─── */

  /**
   * 获取预警学生列表
   * @param {number} threshold - 剩余课时阈值
   * @returns {Promise<object[]>}
   */
  async function getWarningStudents(threshold) {
    const accounts = await getHourAccounts();
    return accounts
      .filter((a) => a.remainingHours <= threshold)
      .map((a) => ({
        studentName: a.studentName,
        course: a.course,
        remainingHours: a.remainingHours,
      }));
  }

  /* ─── 统计 ─── */

  /**
   * 获取考勤统计
   * @param {{start:string,end:string}} dateRange - 日期范围
   * @returns {Promise<{attendanceRate:number,totalConsumedHours:number,warningCount:number}>}
   */
  async function getAttendanceStats(dateRange) {
    const records = await getAttendanceRecords();
    const accounts = await getHourAccounts();

    // 过滤日期范围内的记录
    let filtered = records;
    if (dateRange && dateRange.start && dateRange.end) {
      filtered = records.filter((r) => r.date >= dateRange.start && r.date <= dateRange.end);
    }

    // 出勤率
    let totalStudents = 0;
    let presentStudents = 0;
    for (const r of filtered) {
      for (const s of r.records) {
        totalStudents++;
        if (s.status === 'present') presentStudents++;
      }
    }
    const attendanceRate = totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 100;

    // 消耗课时（出勤学生每人扣 1 次课的课时，这里统计出勤人次 * 2 作为近似值）
    // 更精确的统计需要从模板获取 classHours，这里用出勤人次近似
    const totalConsumedHours = presentStudents * 2;

    // 预警人数
    const warningCount = accounts.filter((a) => a.remainingHours <= 4).length;

    return { attendanceRate, totalConsumedHours, warningCount };
  }

  /* ─── 工具函数 ─── */

  function formatIsoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return {
    getAttendanceRecords: getRecords,
    setAttendanceRecords: setRecords,
    sanitizeAttendanceRecord,
    getAttendanceByDate,
    getAttendanceByScheduleItem,
    getHourAccounts: getAccounts,
    setHourAccounts: setAccounts,
    sanitizeHourAccount,
    getHourAccount,
    generateTodayTasks,
    saveAttendanceRecord,
    deductHours,
    rechargeHours,
    getWarningStudents,
    getAttendanceStats,
  };
}
