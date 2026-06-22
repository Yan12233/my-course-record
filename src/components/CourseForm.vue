<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  course: { type: String, default: '' },
  lessonSchedule: { type: String, default: '' },
  lessonDate: { type: String, default: '' },
  datetimeDisplay: { type: String, default: '' },
  courseSuggestions: { type: Array, default: () => [] },
  timeSlotSuggestions: { type: Array, default: () => [] },
  lockLessonDate: { type: Boolean, default: false },
  showDatetime: { type: Boolean, default: true },
});

const emit = defineEmits([
  'update:course',
  'update:lessonSchedule',
  'update:lessonDate',
  'open-date-picker',
  'open-course-manager',
]);

const useCustomCourse = ref(false);

const courseOption = computed(() => {
  const c = props.course;
  if (!c || c === '（未填写课程）') return '';
  return c;
});

function onCourseSelect(e) {
  const val = e.target.value;
  if (val === '__custom__') {
    useCustomCourse.value = true;
    return;
  }
  if (val === '__manage__') {
    emit('open-course-manager');
    e.target.value = props.course || '';
    return;
  }
  useCustomCourse.value = false;
  emit('update:course', val);
}

watch(() => props.course, (val) => {
  if (val && !props.courseSuggestions.includes(val)) {
    useCustomCourse.value = true;
  }
}, { immediate: true });
</script>

<template>
  <section class="space-y-6">
    <section class="space-y-2">
      <label for="courseSelect" class="block text-sm font-medium text-slate-700">课程</label>
      <div class="flex gap-2">
        <select
          id="courseSelect"
          class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          :value="useCustomCourse ? '__custom__' : (courseSuggestions.includes(course) ? course : '')"
          @change="onCourseSelect"
        >
          <option value="" disabled>选择课程…</option>
          <option v-for="item in courseSuggestions" :key="item" :value="item">{{ item }}</option>
          <option value="__custom__">✏️ 自定义课程…</option>
          <option disabled>──────────</option>
          <option value="__manage__">⚙️ 管理课程分类…</option>
        </select>
      </div>
      <template v-if="useCustomCourse">
        <input
          type="text"
          maxlength="100"
          placeholder="输入自定义课程名"
          autocomplete="off"
          class="mt-1 w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          :value="course"
          @input="emit('update:course', $event.target.value)"
        />
      </template>
      <p class="text-xs text-slate-400">从已设置的课程中选择，如需新类别请选择「自定义」或到「更多 → 管理课程」中添加。</p>
    </section>

    <section class="space-y-2">
      <label for="lessonScheduleInput" class="block text-sm font-medium text-slate-700">班级名称 / 零售课说明</label>
      <input
        id="lessonScheduleInput"
        type="text"
        name="lessonSchedule"
        list="timeSlotSuggestions"
        inputmode="text"
        maxlength="120"
        placeholder="常规课：xx学校初一x班；零售课：上课时间段"
        autocomplete="off"
        class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        :value="props.lessonSchedule"
        @input="emit('update:lessonSchedule', $event.target.value)"
      />
      <datalist id="timeSlotSuggestions">
        <option v-for="item in timeSlotSuggestions" :key="item" :value="item" />
      </datalist>
      <p class="text-xs text-slate-400">常规课仅填班级名；零售课请填时间段，并在上方补充课程名。</p>
    </section>

    <section v-if="!lockLessonDate" class="space-y-2">
      <span class="block text-sm font-medium text-slate-700">上课日期</span>
      <div class="flex gap-2 items-stretch">
        <input
          id="lessonDateInput"
          type="text"
          name="lessonDate"
          inputmode="text"
          maxlength="80"
          placeholder="如 2026-03-14、3月14日、3.14 或自定义说明"
          autocomplete="off"
          class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          :value="props.lessonDate"
          @input="emit('update:lessonDate', $event.target.value)"
        />
        <button
          type="button"
          class="shrink-0 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-800 active:bg-indigo-100"
          title="从系统日历选择"
          @click="emit('open-date-picker')"
        >
          日历
        </button>
      </div>
    </section>
    <p v-else-if="props.lessonDate" class="text-sm text-slate-600">
      上课日期：<span class="font-medium text-slate-900">{{ props.lessonDate }}</span>
    </p>

    <section v-if="showDatetime && datetimeDisplay" class="space-y-2">
      <label for="datetimeDisplay" class="block text-xs font-medium text-slate-500">保存时刻</label>
      <input
        id="datetimeDisplay"
        type="text"
        readonly
        class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm tabular-nums text-slate-600"
        :value="props.datetimeDisplay"
      />
    </section>
  </section>
</template>
