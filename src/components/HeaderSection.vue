<script setup>
defineProps({
  smartPrefillVisible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['open-timetable']);
</script>

<template>
  <header class="text-center space-y-2">
    <h1 class="text-xl font-semibold text-slate-900">上课记录</h1>
    <p class="text-sm text-slate-500">选择课程与时间段，拍照后保存</p>
    <p
      class="text-xs font-medium text-emerald-700"
      aria-live="polite"
      :class="smartPrefillVisible ? '' : 'hidden'"
    >
      ✨ 已根据课表自动预填
    </p>
    <button
      type="button"
      class="mx-auto inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 active:bg-indigo-100"
      @click="emit('open-timetable')"
    >
      📅 我的课表
    </button>
  </header>
</template>
