<script setup>
const props = defineProps({
  course: { type: String, default: '' },
  lessonSchedule: { type: String, default: '' },
  lessonDate: { type: String, default: '' },
  datetimeDisplay: { type: String, default: '' },
  courseSuggestions: { type: Array, default: () => [] },
  timeSlotSuggestions: { type: Array, default: () => [] },
});

const emit = defineEmits([
  'update:course',
  'update:lessonSchedule',
  'update:lessonDate',
  'open-date-picker',
]);
</script>

<template>
  <section class="space-y-6">
    <section class="space-y-2">
      <label for="courseInput" class="block text-sm font-medium text-slate-700">课程名（零售课必填）</label>
      <input
        id="courseInput"
        name="course"
        type="text"
        list="courseSuggestions"
        placeholder="常规课可保持 C++，零售课请填写具体课程名"
        autocomplete="off"
        class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        :value="props.course"
        @input="emit('update:course', $event.target.value)"
      />
      <datalist id="courseSuggestions">
        <option v-for="item in courseSuggestions" :key="item" :value="item" />
      </datalist>
      <p class="text-xs text-slate-400">常规 C++ 课一般无需修改；零售课请填写真实课程名。</p>
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

    <section class="space-y-2">
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

    <section class="space-y-2">
      <label for="datetimeDisplay" class="block text-sm font-medium text-slate-700">保存时刻（备忘）</label>
      <input
        id="datetimeDisplay"
        type="text"
        readonly
        class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base tabular-nums text-slate-700"
        :value="props.datetimeDisplay"
      />
    </section>
  </section>
</template>
