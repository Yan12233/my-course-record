<script setup>
defineProps({
  lessonType: { type: String, default: 'regular' },
});

const emit = defineEmits(['update:lessonType']);
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <p class="text-sm font-medium text-slate-700 mb-2">课程类型</p>
    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        class="rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-colors"
        :class="
          lessonType === 'regular'
            ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
            : 'border-slate-200 bg-white text-slate-600'
        "
        @click="emit('update:lessonType', 'regular')"
      >
        常规课
      </button>
      <button
        type="button"
        class="rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-colors"
        :class="
          lessonType === 'retail'
            ? 'border-amber-500 bg-amber-50 text-amber-900'
            : 'border-slate-200 bg-white text-slate-600'
        "
        @click="emit('update:lessonType', 'retail')"
      >
        零售课
      </button>
    </div>
    <p class="text-xs text-slate-400 mt-2">
      零售课需拍照、填写课堂反馈单；常规课可折叠，需要时再展开高级填写。
    </p>
  </section>
</template>
