/**
 * 排课数据层 Composable
 *
 * 提供 schedule_v1 的 CRUD、冲突检测、旧课表迁移、当日排课查询
 */
import { useDatabase } from './useDatabase';

export function useSchedule() {
  const {
    ensureConfigured,
    generateRecordId,
    sanitizeScheduleItem,
    getScheduleList,
    setScheduleList,
    getTimetableList,
    getDefaultTeacherName,
    TIMETABLE_WEEKDAYS,
    normalizeSlot,
  } = useDatabase();

  /* ─── 基础 CRUD ─── */

  async function getList() {
    return getScheduleList();
  }

  async function setList(list) {
    return setScheduleList(list);
  }

  /* ─── 冲突检测 ─── */

  /**
   * 将 "HH:mm" 时间字符串转为当天的分钟数
   * @param {string} hhmm
   * @returns {number} 分钟数，无法解析时返回 Infinity
   */
  function timeToMinutes(hhmm) {
    const parts = String(hhmm || '').split(':');
    if (parts.length !== 2) return Infinity;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return Infinity;
    return h * 60 + m;
  }

  /**
   * 检测两个时间段是否重叠
   * 先通过 normalizeSlot 解析为标准结构，再直接将 start/end 转为分钟数比较。
   * @param {{start:string,end:string}} slotA
   * @param {{start:string,end:string}} slotB
   * @returns {boolean}
   */
  function isSlotOverlap(slotA, slotB) {
    const nA = normalizeSlot(slotA);
    const nB = normalizeSlot(slotB);
    if (!nA.structured || !nB.structured) return false;

    const aStart = timeToMinutes(nA.start);
    const aEnd = timeToMinutes(nA.end);
    const bStart = timeToMinutes(nB.start);
    const bEnd = timeToMinutes(nB.end);

    if (aStart === Infinity || bStart === Infinity) return false;
    // end 无法解析时兜底为 start + 120 分钟
    const aEndMin = aEnd === Infinity ? aStart + 120 : aEnd;
    const bEndMin = bEnd === Infinity ? bStart + 120 : bEnd;

    return aStart < bEndMin && bStart < aEndMin;
  }

  /**
   * 检测教师冲突
   * @param {string} teacher - 教师姓名
   * @param {string} weekday - 星期
   * @param {{start:string,end:string}} slot - 时段
   * @param {string} [excludeId] - 排除的排课项 ID（编辑时排除自身）
   * @returns {Promise<object|null>} 冲突的排课项，null 表示无冲突
   */
  async function checkTeacherConflict(teacher, weekday, slot, excludeId) {
    if (!teacher || !weekday) return null;
    const items = await getScheduleList();
    const n = normalizeSlot(slot);
    if (!n.structured) return null;
    for (const it of items) {
      if (excludeId && it.id === excludeId) continue;
      if (it.teacher !== teacher) continue;
      if (it.weekday !== weekday) continue;
      if (isSlotOverlap(it.slot, n)) return it;
    }
    return null;
  }

  /**
   * 检测教室冲突
   * @param {string} classroom - 教室
   * @param {string} weekday - 星期
   * @param {{start:string,end:string}} slot - 时段
   * @param {string} [excludeId] - 排除的排课项 ID
   * @returns {Promise<object|null>} 冲突的排课项，null 表示无冲突
   */
  async function checkClassroomConflict(classroom, weekday, slot, excludeId) {
    if (!classroom || !weekday) return null;
    const items = await getScheduleList();
    const n = normalizeSlot(slot);
    if (!n.structured) return null;
    for (const it of items) {
      if (excludeId && it.id === excludeId) continue;
      if (it.classroom !== classroom) continue;
      if (it.weekday !== weekday) continue;
      if (isSlotOverlap(it.slot, n)) return it;
    }
    return null;
  }

  /* ─── 旧课表迁移 ─── */

  /**
   * 从 my_timetable 迁移到 schedule_v1
   * 迁移规则：teacher 取 default_teacher_name_v1，classroom 留空，studentGroup 留空
   * @returns {Promise<{migrated:number}>}
   */
  async function migrateFromTimetable() {
    const existing = await getScheduleList();
    if (existing.length > 0) return { migrated: 0 };

    const timetable = await getTimetableList();
    if (!timetable.length) return { migrated: 0 };

    const defaultTeacher = await getDefaultTeacherName();
    const now = Date.now();
    const migrated = [];
    for (const tt of timetable) {
      const item = sanitizeScheduleItem({
        id: generateRecordId(),
        weekday: tt.weekday,
        slot: tt.slot,
        course: tt.course,
        teacher: defaultTeacher || '',
        classroom: '',
        studentGroup: [],
        lessonType: tt.lessonType || 'regular',
        templateId: tt.templateId || '',
        resourceId: '',
        updatedAt: now,
      });
      if (item) migrated.push(item);
    }

    if (migrated.length) {
      await setScheduleList(migrated);
    }
    return { migrated: migrated.length };
  }

  /* ─── 查询 ─── */

  /**
   * 获取当日排课项
   * @returns {Promise<object[]>}
   */
  async function getTodayScheduleItems() {
    const items = await getScheduleList();
    const today = new Date().getDay(); // 0=周日
    const weekday = TIMETABLE_WEEKDAYS[(today + 6) % 7]; // 映射到 0=周一
    return items.filter((it) => it.weekday === weekday);
  }

  /**
   * 按星期获取排课项
   * @param {string} weekday
   * @returns {Promise<object[]>}
   */
  async function getScheduleByWeekday(weekday) {
    const items = await getScheduleList();
    return items.filter((it) => it.weekday === weekday);
  }

  return {
    getScheduleList: getList,
    setScheduleList: setList,
    sanitizeScheduleItem,
    checkTeacherConflict,
    checkClassroomConflict,
    migrateFromTimetable,
    getTodayScheduleItems,
    getScheduleByWeekday,
    isSlotOverlap,
  };
}
