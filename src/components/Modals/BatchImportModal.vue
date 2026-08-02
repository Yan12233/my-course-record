<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  rows: { type: Array, default: () => [] },
  applyValues: {
    type: Object,
    default: () => ({
      course: '',
      schedule: '',
      date: '',
    }),
  },
  saving: { type: Boolean, default: false },
});

const emit = defineEmits([
  'close',
  'apply',
  'save-all',
  'update:applyCourse',
  'update:applySchedule',
  'update:applyDate',
  'update:rowField',
]);
</script>

<template>
  <div
    class="fixed inset-0 z-[175] flex items-center justify-center bg-slate-900/65 p-4"
    :class="visible ? '' : 'hidden'"
    @click="emit('close')"
  >
    <div
      class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-center"
      role="dialog"
      aria-modal="true"
      @click.stop
    >
      <div class="text-4xl">🚧</div>
      <h2 class="text-lg font-semibold text-slate-900">批量补录</h2>
      <p class="text-sm text-slate-500 leading-relaxed">
        此功能正在积极开发中。<br>
        后续您将可以一次选择多张图片，快速补录多条课程记录。
      </p>
      <p class="text-xs text-slate-400">敬请期待！</p>
      <button
        type="button"
        class="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white active:bg-indigo-700"
        @click="emit('close')"
      >
        知道了
      </button>
    </div>
  </div>
</template>
