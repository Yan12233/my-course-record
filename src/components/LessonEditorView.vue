<script setup>
import PhotoUploader from './PhotoUploader.vue';
import CourseForm from './CourseForm.vue';
import LessonTypeBar from './LessonTypeBar.vue';
import LessonMetricsFields from './LessonMetricsFields.vue';
import FeedbackForm from './FeedbackForm.vue';
import StudentManager from './StudentManager.vue';
import ActionButtons from './ActionButtons.vue';

defineProps({
  isoDate: { type: String, default: '' },
  photoHint: { type: String, default: '' },
  previewUrl: { type: String, default: '' },
  course: { type: String, default: '' },
  lessonSchedule: { type: String, default: '' },
  lessonDate: { type: String, default: '' },
  datetimeDisplay: { type: String, default: '' },
  courseSuggestions: { type: Array, default: () => [] },
  timeSlotSuggestions: { type: Array, default: () => [] },
  lessonType: { type: String, default: 'regular' },
  classHours: { type: [Number, String], default: '' },
  feeRate: { type: [Number, String], default: '' },
  headCount: { type: [Number, String], default: '1' },
  advancedExpanded: { type: Boolean, default: false },
  teacher: { type: String, default: '' },
  admin: { type: String, default: '' },
  classTime: { type: String, default: '' },
  courseContent: { type: String, default: '' },
  students: { type: Array, default: () => [] },
  newStudentName: { type: String, default: '' },
  savePending: { type: Boolean, default: false },
  isEditMode: { type: Boolean, default: false },
});

const emit = defineEmits([
  'back',
  'pick-photo',
  'update:course',
  'update:lessonSchedule',
  'update:lessonDate',
  'update:lessonType',
  'update:classHours',
  'update:feeRate',
  'update:headCount',
  'toggle-advanced',
  'update:teacher',
  'update:admin',
  'update:classTime',
  'update:courseContent',
  'update:newStudentName',
  'add-student',
  'remove-student',
  'step-student',
  'update-student-field',
  'save-common',
  'load-common',
  'save-copy',
  'export-excel',
]);
</script>

<template>
  <section class="space-y-4">
    <header class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 active:bg-slate-50"
        @click="emit('back')"
      >
        ‹ 返回
      </button>
      <h2 class="flex-1 text-center text-base font-semibold text-slate-900 truncate">
        {{ isEditMode ? '编辑课程' : '添加课程' }}
        <span v-if="isoDate" class="block text-xs font-normal text-slate-500">{{ isoDate }}</span>
      </h2>
      <div class="w-[52px]" />
    </header>

    <PhotoUploader
      :photo-hint="photoHint"
      :preview-url="previewUrl"
      :show-batch="false"
      :require-photo="lessonType === 'retail'"
      @pick-photo="emit('pick-photo', $event)"
    />

    <LessonTypeBar :lesson-type="lessonType" @update:lesson-type="emit('update:lessonType', $event)" />

    <CourseForm
      :course="course"
      :lesson-schedule="lessonSchedule"
      :lesson-date="lessonDate"
      :datetime-display="datetimeDisplay"
      :course-suggestions="courseSuggestions"
      :time-slot-suggestions="timeSlotSuggestions"
      :lock-lesson-date="true"
      :show-datetime="!!datetimeDisplay"
      @update:course="emit('update:course', $event)"
      @update:lesson-schedule="emit('update:lessonSchedule', $event)"
      @update:lesson-date="emit('update:lessonDate', $event)"
    />

    <LessonMetricsFields
      :lesson-type="lessonType"
      :class-hours="classHours"
      :fee-rate="feeRate"
      :head-count="headCount"
      @update:class-hours="emit('update:classHours', $event)"
      @update:fee-rate="emit('update:feeRate', $event)"
      @update:head-count="emit('update:headCount', $event)"
    />

    <div v-if="lessonType === 'regular' && !advancedExpanded" class="text-center">
      <button
        type="button"
        class="text-sm font-medium text-indigo-600 underline-offset-2 hover:underline active:text-indigo-800"
        @click="emit('toggle-advanced')"
      >
        展开高级填写（课堂反馈单）
      </button>
    </div>

    <template v-if="lessonType === 'retail' || advancedExpanded">
      <FeedbackForm
        :teacher="teacher"
        :admin="admin"
        :class-time="classTime"
        :course-content="courseContent"
        @update:teacher="emit('update:teacher', $event)"
        @update:admin="emit('update:admin', $event)"
        @update:class-time="emit('update:classTime', $event)"
        @update:course-content="emit('update:courseContent', $event)"
      />
      <section class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <StudentManager
          :students="students"
          :new-student-name="newStudentName"
          @update:new-student-name="emit('update:newStudentName', $event)"
          @add-student="emit('add-student')"
          @remove-student="emit('remove-student', $event)"
          @step-student="(idx, field, step) => emit('step-student', idx, field, step)"
          @update-student-field="(idx, field, val) => emit('update-student-field', idx, field, val)"
          @save-common="emit('save-common')"
          @load-common="emit('load-common')"
        />
      </section>
      <button
        v-if="lessonType === 'regular' && advancedExpanded"
        type="button"
        class="w-full text-center text-xs text-slate-500"
        @click="emit('toggle-advanced')"
      >
        收起高级填写
      </button>
    </template>

    <ActionButtons :save-pending="savePending" @save-copy="emit('save-copy')" @export-excel="emit('export-excel')" />
  </section>
</template>
