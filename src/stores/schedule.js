/**
 * 排课 Pinia Store
 *
 * 响应式管理排课数据，提供 CRUD、冲突检测、当日查询、迁移等 actions
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSchedule } from '../composables/useSchedule';
import { TIMETABLE_WEEKDAYS } from '../composables/useDatabase';

export const useScheduleStore = defineStore('schedule', () => {
  // ── State ──
  const items = ref([]);
  const loaded = ref(false);

  // ── Getters ──

  /** 今日排课项 */
  const todayItems = computed(() => {
    const today = new Date().getDay();
    const weekday = TIMETABLE_WEEKDAYS[(today + 6) % 7];
    return items.value.filter((it) => it.weekday === weekday);
  });

  /** 今日教师冲突列表 */
  const todayTeacherConflicts = computed(() => {
    const today = todayItems.value;
    const conflicts = [];
    const seen = new Set();
    for (let i = 0; i < today.length; i++) {
      for (let j = i + 1; j < today.length; j++) {
        const a = today[i];
        const b = today[j];
        if (a.teacher && a.teacher === b.teacher) {
          if (isSlotOverlap(a.slot, b.slot)) {
            const key = `${a.id}-${b.id}`;
            if (!seen.has(key)) {
              seen.add(key);
              conflicts.push({ itemA: a, itemB: b, type: 'teacher' });
            }
          }
        }
      }
    }
    return conflicts;
  });

  // ── Actions ──

  const scheduleApi = useSchedule();

  /** 加载排课数据 */
  async function load() {
    const list = await scheduleApi.getScheduleList();
    items.value = list;
    loaded.value = true;
  }

  /**
   * 新增排课项
   * @param {object} item - ScheduleItem
   * @returns {Promise<object>}
   */
  async function addItem(item) {
    const list = items.value.slice();
    list.push(item);
    items.value = await scheduleApi.setScheduleList(list);
    return item;
  }

  /**
   * 更新排课项
   * @param {string} id
   * @param {Function} updater - (item) => newItem
   */
  async function updateItem(id, updater) {
    const list = items.value.slice();
    const idx = list.findIndex((it) => it.id === id);
    if (idx < 0) throw new Error('排课项不存在');
    const updated = updater(list[idx]);
    list[idx] = updated;
    items.value = await scheduleApi.setScheduleList(list);
  }

  /**
   * 删除排课项
   * @param {string} id
   */
  async function removeItem(id) {
    const list = items.value.filter((it) => it.id !== id);
    items.value = await scheduleApi.setScheduleList(list);
  }

  /**
   * 冲突检测
   * @param {string} teacher
   * @param {string} classroom
   * @param {string} weekday
   * @param {{start:string,end:string}} slot
   * @param {string} [excludeId]
   * @returns {Promise<{teacherConflict?:object,classroomConflict?:object}>}
   */
  async function checkConflict(teacher, classroom, weekday, slot, excludeId) {
    const teacherConflict = await scheduleApi.checkTeacherConflict(teacher, weekday, slot, excludeId);
    const classroomConflict = await scheduleApi.checkClassroomConflict(classroom, weekday, slot, excludeId);
    return { teacherConflict, classroomConflict };
  }

  /**
   * 按星期获取排课项
   * @param {string} weekday
   * @returns {object[]}
   */
  function getItemsByWeekday(weekday) {
    return items.value.filter((it) => it.weekday === weekday);
  }

  /**
   * 如果排课数据为空，尝试从旧课表迁移
   */
  async function migrateIfNeeded() {
    if (items.value.length === 0) {
      const result = await scheduleApi.migrateFromTimetable();
      if (result.migrated > 0) {
        await load();
      }
      return result;
    }
    return { migrated: 0 };
  }

  /* ─── 内部工具 ─── */

  function isSlotOverlap(slotA, slotB) {
    return scheduleApi.isSlotOverlap(slotA, slotB);
  }

  return {
    items,
    loaded,
    todayItems,
    todayTeacherConflicts,
    load,
    addItem,
    updateItem,
    removeItem,
    checkConflict,
    getItemsByWeekday,
    migrateIfNeeded,
  };
});
