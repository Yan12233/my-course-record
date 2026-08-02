<script setup>
import { ref, watch, computed } from 'vue';
import TimeWheelPicker from '../TimeWheelPicker.vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  editingItem: { type: Object, default: null },
  defaultWeekday: { type: String, default: '周一' },
  defaultSlot: { type: Object, default: () => ({ start: '', end: '' }) },
  courseSuggestions: { type: Array, default: () => [] },
  templates: { type: Array, default: () => [] },
  studentNames: { type: Array, default: () => [] },
  classroomSuggestions: { type: Array, default: () => [] },
  defaultTeacherName: { type: String, default: '' },
  resources: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'submit', 'delete']);

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// ── 表单状态 ──
const form = ref({
  weekday: '周一',
  slot: { start: '', end: '' },
  course: '',
  teacher: '',
  classroom: '',
  studentGroup: [],
  lessonType: 'regular',
  templateId: '',
  resourceId: '',
});

const customCourseInput = ref(null);
const studentSearchText = ref('');

const isCustomCourse = computed(() => {
  const c = form.value.course || '';
  return c === '__custom__' || (c && !props.courseSuggestions.includes(c));
});

const isEditing = computed(() => !!props.editingItem);

/** 初始化表单 */
function initForm() {
  if (props.editingItem) {
    form.value = {
      weekday: props.editingItem.weekday || '周一',
      slot: {
        start: props.editingItem.slot?.start || '',
        end: props.editingItem.slot?.end || '',
      },
      course: props.editingItem.course || '',
      teacher: props.editingItem.teacher || '',
      classroom: props.editingItem.classroom || '',
      studentGroup: Array.isArray(props.editingItem.studentGroup)
        ? [...props.editingItem.studentGroup]
        : [],
      lessonType: props.editingItem.lessonType === 'retail' ? 'retail' : 'regular',
      templateId: props.editingItem.templateId || '',
      resourceId: props.editingItem.resourceId || '',
    };
  } else {
    form.value = {
      weekday: props.defaultWeekday || '周一',
      slot: { ...props.defaultSlot },
      course: '',
      teacher: props.defaultTeacherName || '',
      classroom: '',
      studentGroup: [],
      lessonType: 'regular',
      templateId: '',
      resourceId: '',
    };
  }
  studentSearchText.value = '';
}

watch(() => props.visible, (v) => {
  if (v) initForm();
});

// 首次挂载时如果 visible 也初始化
watch(() => props.editingItem, () => {
  if (props.visible) initForm();
}, { deep: true });

function onCourseChange(e) {
  const val = e.target.value;
  if (val === '__custom__') {
    form.value.course = '__custom__';
    setTimeout(() => customCourseInput.value?.focus(), 50);
  } else {
    form.value.course = val;
  }
}

function onCustomCourseInput(e) {
  form.value.course = e.target.value;
}

function toggleStudent(name) {
  const idx = form.value.studentGroup.indexOf(name);
  if (idx >= 0) {
    form.value.studentGroup.splice(idx, 1);
  } else {
    form.value.studentGroup.push(name);
  }
}

function removeStudent(name) {
  const idx = form.value.studentGroup.indexOf(name);
  if (idx >= 0) form.value.studentGroup.splice(idx, 1);
}

const filteredStudentNames = computed(() => {
  const kw = studentSearchText.value.trim().toLowerCase();
  if (!kw) return props.studentNames;
  return props.studentNames.filter((n) => String(n).toLowerCase().includes(kw));
});

function onSubmit() {
  const course = form.value.course === '__custom__' ? '' : String(form.value.course || '').trim();
  if (!course) {
    emit('submit', { error: '请选择或输入课程名称' });
    return;
  }
  if (!form.value.slot.start || !form.value.slot.end) {
    emit('submit', { error: '请选择上课时间段' });
    return;
  }

  const data = {
    id: props.editingItem?.id || '',
    weekday: form.value.weekday,
    slot: { start: form.value.slot.start, end: form.value.slot.end },
    course,
    teacher: String(form.value.teacher || '').trim(),
    classroom: String(form.value.classroom || '').trim(),
    studentGroup: [...form.value.studentGroup],
    lessonType: form.value.lessonType,
    templateId: form.value.templateId || '',
    resourceId: form.value.resourceId || '',
  };
  emit('submit', data);
}

function onDelete() {
  if (props.editingItem?.id) {
    emit('delete', props.editingItem.id);
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-[170] flex items-stretch justify-center bg-slate-900/65"
    :class="visible ? '' : 'hidden'"
    @click="emit('close')"
  >
    <div
      class="absolute bottom-0 w-full max-w-md max-h-[88dvh] overflow-y-auto rounded-t-2xl bg-white dark:bg-slate-800 shadow-2xl"
      @click.stop
    >
      <!-- Header -->
      <div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
        <h2 class="text-base font-semibold text-slate-900 dark:text-white">
          {{ isEditing ? '编辑排课' : '新建排课' }}
        </h2>
        <button
          type="button"
          class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Form -->
      <div class="px-4 py-4 space-y-4">
        <!-- 课程选择 -->
        <div>
          <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">课程</label>
          <select
            class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
            :value="courseSuggestions.includes(form.course) ? form.course : (form.course ? '__custom__' : '')"
            @change="onCourseChange"
          >
            <option value="" disabled>选择课程…</option>
            <option v-for="course in courseSuggestions" :key="course" :value="course">{{ course }}</option>
            <option disabled>──────────</option>
            <option value="__custom__">✏️ 自定义课程…</option>
          </select>
          <input
            v-if="isCustomCourse"
            ref="customCourseInput"
            type="text"
            maxlength="80"
            placeholder="输入自定义课程名"
            class="mt-1.5 w-full rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400"
            :value="form.course === '__custom__' ? '' : form.course"
            @input="onCustomCourseInput"
          />
        </div>

        <!-- 教师 -->
        <div>
          <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">教师</label>
          <input
            v-model="form.teacher"
            type="text"
            maxlength="40"
            placeholder="教师姓名"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        <!-- 教室 -->
        <div>
          <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">教室</label>
          <input
            v-model="form.classroom"
            type="text"
            list="classroom-suggestions"
            maxlength="40"
            placeholder="教室（如 101）"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <datalist id="classroom-suggestions">
            <option v-for="room in classroomSuggestions" :key="room" :value="room" />
          </datalist>
        </div>

        <!-- 星期 -->
        <div>
          <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">星期</label>
          <div class="flex gap-1.5 flex-wrap">
            <button
              v-for="day in WEEKDAYS"
              :key="day"
              type="button"
              class="rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              :class="form.weekday === day
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'"
              @click="form.weekday = day"
            >
              {{ day }}
            </button>
          </div>
        </div>

        <!-- 时间段 -->
        <div>
          <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">上课时间段</label>
          <TimeWheelPicker
            :model-value="form.slot"
            @update:model-value="form.slot = $event"
          />
        </div>

        <!-- 课型 -->
        <div>
          <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">课程类型</label>
          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-xl border py-2.5 text-xs font-medium transition-colors"
              :class="form.lessonType === 'regular'
                ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400'"
              @click="form.lessonType = 'regular'"
            >
              📋 常规课
            </button>
            <button
              type="button"
              class="flex-1 rounded-xl border py-2.5 text-xs font-medium transition-colors"
              :class="form.lessonType === 'retail'
                ? 'border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400'"
              @click="form.lessonType = 'retail'"
            >
              🛍 零售课
            </button>
          </div>
        </div>

        <!-- 关联模板 -->
        <div>
          <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">关联模板（可选）</label>
          <select
            v-model="form.templateId"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
          >
            <option value="">不关联模板</option>
            <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
          </select>
        </div>

        <!-- 关联教案（P1） -->
        <div v-if="resources.length">
          <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">关联教案（可选）</label>
          <select
            v-model="form.resourceId"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
          >
            <option value="">不关联教案</option>
            <option v-for="res in resources" :key="res.id" :value="res.id">
              {{ res.title }}（{{ res.subject }}）
            </option>
          </select>
        </div>

        <!-- 学生选择 -->
        <div>
          <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">学生名单</label>
          <!-- 已选学生标签 -->
          <div v-if="form.studentGroup.length" class="flex flex-wrap gap-1.5 mb-2">
            <span
              v-for="name in form.studentGroup"
              :key="name"
              class="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-1 text-xs text-indigo-700 dark:text-indigo-300"
            >
              {{ name }}
              <button type="button" class="text-indigo-400 hover:text-indigo-600" @click="removeStudent(name)">✕</button>
            </span>
          </div>
          <!-- 搜索框 -->
          <input
            v-model="studentSearchText"
            type="text"
            placeholder="搜索学生…"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <!-- 学生列表 -->
          <div class="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-700">
            <button
              v-for="name in filteredStudentNames"
              :key="name"
              type="button"
              class="w-full text-left px-3 py-2 text-sm transition-colors"
              :class="form.studentGroup.includes(name)
                ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'"
              @click="toggleStudent(name)"
            >
              {{ form.studentGroup.includes(name) ? '✓ ' : '' }}{{ name }}
            </button>
            <p v-if="!filteredStudentNames.length" class="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">
              暂无可选学生，请先在课程记录中添加常用学生
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 flex gap-2 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
        <button
          v-if="isEditing"
          type="button"
          class="rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 active:bg-rose-50 dark:active:bg-rose-900/30"
          @click="onDelete"
        >
          删除
        </button>
        <button
          type="button"
          class="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-indigo-700"
          @click="onSubmit"
        >
          {{ isEditing ? '保存修改' : '添加排课' }}
        </button>
      </div>
    </div>
  </div>
</template>
