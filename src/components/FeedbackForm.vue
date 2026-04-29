<script setup>
const props = defineProps({
  teacher: { type: String, default: '' },
  admin: { type: String, default: '林玲' },
  classTime: { type: String, default: '' },
  courseContent: { type: String, default: '' },
});

const emit = defineEmits([
  'update:teacher',
  'update:admin',
  'update:classTime',
  'update:courseContent',
]);
</script>

<template>
  <section
    class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm space-y-3"
    aria-labelledby="feedbackHeading"
  >
    <h2 id="feedbackHeading" class="text-base font-semibold text-slate-900">课堂详细反馈单</h2>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <label class="text-sm text-slate-700">
        <span class="mb-1 block font-medium">教师</span>
        <input
          id="teacherInput"
          type="text"
          maxlength="40"
          placeholder="请输入教师姓名"
          autocomplete="off"
          class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          :value="props.teacher"
          @input="emit('update:teacher', $event.target.value)"
        />
      </label>
      <label class="text-sm text-slate-700">
        <span class="mb-1 block font-medium">咨询教务</span>
        <input
          id="adminInput"
          type="text"
          maxlength="40"
          placeholder="默认林玲"
          autocomplete="off"
          class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          :value="props.admin"
          @input="emit('update:admin', $event.target.value)"
        />
      </label>
    </div>
    <label class="block text-sm text-slate-700">
      <span class="mb-1 block font-medium">上课时间</span>
      <input
        id="classTimeInput"
        type="text"
        maxlength="80"
        placeholder="如：26.04.18 16:10-18:10"
        autocomplete="off"
        class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        :value="props.classTime"
        @input="emit('update:classTime', $event.target.value)"
      />
    </label>
    <div class="space-y-2">
      <label for="courseContentInput" class="block text-sm font-medium text-slate-700">今日授课内容</label>
      <textarea
        id="courseContentInput"
        rows="4"
        placeholder="请输入本节课授课内容..."
        class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        :value="props.courseContent"
        @input="emit('update:courseContent', $event.target.value)"
      />
    </div>
  </section>
</template>
