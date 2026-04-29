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
      <label for="courseInput" class="block text-sm font-medium text-slate-700">课程</label>
      <input
        id="courseInput"
        name="course"
        type="text"
        list="courseSuggestions"
        placeholder="选择或输入课程名称"
        autocomplete="off"
        class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        :value="props.course"
        @input="emit('update:course', $event.target.value)"
      />
      <datalist id="courseSuggestions">
        <option v-for="item in courseSuggestions" :key="item" :value="item" />
      </datalist>
      <p class="text-xs text-slate-400">可从列表中选，或直接输入新课名后在下方保存。</p>
    </section>

    <section class="space-y-2">
      <label for="lessonScheduleInput" class="block text-sm font-medium text-slate-700">
        上课时间段
      </label>
      <input
        id="lessonScheduleInput"
        type="text"
        name="lessonSchedule"
        list="timeSlotSuggestions"
        inputmode="text"
        maxlength="120"
        placeholder="在下拉中选常用时段，或直接输入新建"
        autocomplete="off"
        class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        :value="props.lessonSchedule"
        @input="emit('update:lessonSchedule', $event.target.value)"
      />
      <datalist id="timeSlotSuggestions">
        <option v-for="item in timeSlotSuggestions" :key="item" :value="item" />
      </datalist>
      <p class="text-xs text-slate-400">
        请先填写<strong class="font-medium text-slate-600">课程</strong>，再在此<strong>选择或新建时间段</strong>。
      </p>
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
