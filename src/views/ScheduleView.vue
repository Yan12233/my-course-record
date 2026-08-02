<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import ScheduleGrid from '../components/Schedule/ScheduleGrid.vue';
import ScheduleEditorSheet from '../components/Schedule/ScheduleEditorSheet.vue';
import { useScheduleStore } from '../stores/schedule';
import { useResourceStore } from '../stores/resource';
import { useUiStore } from '../stores/ui';
import { useDatabase } from '../composables/useDatabase';
import { DEFAULT_SCHEDULE_SLOTS } from '../utils/scheduleConstants';

const router = useRouter();
const scheduleStore = useScheduleStore();
const resourceStore = useResourceStore();
const ui = useUiStore();

const {
  TIMETABLE_WEEKDAYS,
  getCourseList,
  getLessonTemplates,
  getCommonStudentNames,
  getDefaultTeacherName,
  getClassroomSuggestions,
  rememberClassroom,
  generateRecordId,
  normalizeSlot,
} = useDatabase();

// ── 数据 ──
const courseList = ref([]);
const lessonTemplates = ref([]);
const studentNames = ref([]);
const defaultTeacherName = ref('');
const classroomSuggestions = ref([]);

// ── 编辑器状态 ──
const editorVisible = ref(false);
const editingItem = ref(null);
const defaultWeekday = ref('周一');
const defaultSlot = ref({ start: '', end: '' });

// ── 冲突格子 ──
const conflictCell = ref(null);

// ── 加载状态 ──
const loading = ref(true);

onMounted(async () => {
  loading.value = true;
  try {
    // 加载排课数据
    await scheduleStore.load();
    // 检查迁移
    await scheduleStore.migrateIfNeeded();

    // 并行加载辅助数据
    const [courses, templates, students, teacher, classrooms] = await Promise.all([
      getCourseList(),
      getLessonTemplates(),
      getCommonStudentNames(),
      getDefaultTeacherName(),
      getClassroomSuggestions(),
    ]);
    courseList.value = courses;
    lessonTemplates.value = templates;
    studentNames.value = students;
    defaultTeacherName.value = teacher;
    classroomSuggestions.value = classrooms;

    // 加载资源库数据（排课可选关联教案）
    await resourceStore.load();
  } catch (err) {
    ui.showToast('加载排课数据失败', 'error');
  } finally {
    loading.value = false;
  }
});

/** 点击空白格 → 打开新建表单 */
function onCellClick(payload) {
  editingItem.value = null;
  defaultWeekday.value = payload.weekday;
  defaultSlot.value = payload.slot || { start: '', end: '' };
  editorVisible.value = true;
}

/** 点击课程卡片 → 打开编辑表单 */
function onCardClick(item) {
  editingItem.value = item;
  defaultWeekday.value = item.weekday;
  defaultSlot.value = item.slot || { start: '', end: '' };
  editorVisible.value = true;
}

/** 拖拽放置 → 移动排课项 */
async function onCardDrop(payload) {
  const { itemId, targetWeekday, targetSlotStart } = payload;
  if (!itemId || !targetWeekday) return;

  const item = scheduleStore.items.find((it) => it.id === itemId);
  if (!item) return;

  // 查找目标时段行
  let targetSlot = null;
  if (targetSlotStart && targetSlotStart !== '__other__') {
    const slotRow = DEFAULT_SCHEDULE_SLOTS.find((s) => s.start === targetSlotStart);
    if (slotRow) {
      targetSlot = { start: slotRow.start, end: slotRow.end };
    }
  }

  // 如果目标格子与源格子相同，忽略
  if (item.weekday === targetWeekday && targetSlot && item.slot.start === targetSlot.start) {
    return;
  }

  // 如果没有目标 slot，保持原 slot
  const newSlot = targetSlot || item.slot;

  // 冲突检测
  const conflict = await scheduleStore.checkConflict(
    item.teacher,
    item.classroom,
    targetWeekday,
    newSlot,
    itemId,
  );

  if (conflict.teacherConflict) {
    ui.showToast(
      `教师[${item.teacher}]在该时段已有[${conflict.teacherConflict.course}]课程`,
      'error',
    );
    conflictCell.value = { weekday: targetWeekday, slotStart: targetSlotStart };
    setTimeout(() => { conflictCell.value = null; }, 2000);
    return;
  }

  if (conflict.classroomConflict) {
    ui.showToast(
      `教室[${item.classroom}]在该时段已被[${conflict.classroomConflict.course}]占用`,
      'error',
    );
    conflictCell.value = { weekday: targetWeekday, slotStart: targetSlotStart };
    setTimeout(() => { conflictCell.value = null; }, 2000);
    return;
  }

  // 更新排课项
  await scheduleStore.updateItem(itemId, (it) => ({
    ...it,
    weekday: targetWeekday,
    slot: newSlot,
    updatedAt: Date.now(),
  }));
  ui.showToast('排课已更新', 'success');
}

/** 表单提交 → 新增或编辑 */
async function onEditorSubmit(data) {
  if (data.error) {
    ui.showToast(data.error, 'error');
    return;
  }

  // 记忆教室
  if (data.classroom) {
    rememberClassroom(data.classroom).then((list) => {
      classroomSuggestions.value = list;
    });
  }

  // 冲突检测
  const conflict = await scheduleStore.checkConflict(
    data.teacher,
    data.classroom,
    data.weekday,
    data.slot,
    data.id || undefined,
  );

  if (conflict.teacherConflict) {
    ui.showToast(
      `教师[${data.teacher}]在该时段已有[${conflict.teacherConflict.course}]课程`,
      'error',
    );
    return;
  }

  if (conflict.classroomConflict) {
    ui.showToast(
      `教室[${data.classroom}]在该时段已被[${conflict.classroomConflict.course}]占用`,
      'error',
    );
    return;
  }

  if (data.id) {
    // 编辑
    await scheduleStore.updateItem(data.id, (it) => ({
      ...it,
      weekday: data.weekday,
      slot: data.slot,
      course: data.course,
      teacher: data.teacher,
      classroom: data.classroom,
      studentGroup: data.studentGroup,
      lessonType: data.lessonType,
      templateId: data.templateId,
      resourceId: data.resourceId || '',
      updatedAt: Date.now(),
    }));
    ui.showToast('排课已更新', 'success');
  } else {
    // 新增
    const newItem = {
      id: generateRecordId(),
      weekday: data.weekday,
      slot: data.slot,
      course: data.course,
      teacher: data.teacher,
      classroom: data.classroom,
      studentGroup: data.studentGroup,
      lessonType: data.lessonType,
      templateId: data.templateId,
      resourceId: data.resourceId || '',
      updatedAt: Date.now(),
    };
    await scheduleStore.addItem(newItem);
    ui.showToast('已添加排课', 'success');
  }

  editorVisible.value = false;
}

/** 删除排课项 */
async function onEditorDelete(id) {
  await scheduleStore.removeItem(id);
  ui.showToast('已删除排课', 'success');
  editorVisible.value = false;
}

/** 跳转录课 */
function goToRecord(itemId) {
  router.push({ path: '/teaching/records', query: { fromSchedule: itemId } });
}

/** 排课卡片上的"录课"按钮 */
function onCardRecord(item) {
  goToRecord(item.id);
}
</script>

<template>
  <div class="px-4 py-3 pb-6">
    <!-- 加载中 -->
    <div v-if="loading" class="space-y-3 animate-pulse">
      <div class="h-8 rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div class="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800" />
    </div>

    <template v-else>
      <!-- 工具栏 -->
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-300">周课表</h2>
        <button
          class="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white active:bg-indigo-700 transition-colors"
          @click="editingItem = null; defaultWeekday = '周一'; defaultSlot = { start: '', end: '' }; editorVisible = true"
        >
          + 新建排课
        </button>
      </div>

      <!-- 排课网格 -->
      <ScheduleGrid
        :items="scheduleStore.items"
        :slots="DEFAULT_SCHEDULE_SLOTS"
        :weekdays="TIMETABLE_WEEKDAYS"
        :course-list="courseList"
        :conflict-cell="conflictCell"
        @cell-click="onCellClick"
        @card-click="onCardClick"
        @card-record="onCardRecord"
        @drop="onCardDrop"
      />

      <!-- 提示 -->
      <div class="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
        <p class="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
          💡 长按课程卡片可拖拽到其他时段，点击空白格可新建排课
        </p>
      </div>

      <!-- 排课统计 -->
      <div v-if="scheduleStore.items.length" class="mt-3 grid grid-cols-3 gap-2">
        <div class="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 p-3 text-center">
          <div class="text-lg font-bold text-indigo-600 dark:text-indigo-400">{{ scheduleStore.items.length }}</div>
          <div class="text-[10px] text-indigo-400 dark:text-indigo-500">总排课数</div>
        </div>
        <div class="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
          <div class="text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ scheduleStore.todayItems.length }}</div>
          <div class="text-[10px] text-emerald-400 dark:text-emerald-500">今日课程</div>
        </div>
        <div class="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 text-center">
          <div class="text-lg font-bold text-amber-600 dark:text-amber-400">{{ scheduleStore.todayTeacherConflicts.length }}</div>
          <div class="text-[10px] text-amber-400 dark:text-amber-500">今日冲突</div>
        </div>
      </div>
    </template>

    <!-- 编辑器弹窗 -->
    <ScheduleEditorSheet
      :visible="editorVisible"
      :editing-item="editingItem"
      :default-weekday="defaultWeekday"
      :default-slot="defaultSlot"
      :course-suggestions="courseList"
      :templates="lessonTemplates"
      :student-names="studentNames"
      :classroom-suggestions="classroomSuggestions"
      :default-teacher-name="defaultTeacherName"
      :resources="resourceStore.items"
      @close="editorVisible = false"
      @submit="onEditorSubmit"
      @delete="onEditorDelete"
    />
  </div>
</template>
