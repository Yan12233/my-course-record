<script setup>
defineProps({
  savePending: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['save-copy', 'export-excel']);
</script>

<template>
  <section class="pt-2 space-y-2">
    <button
      type="button"
      class="w-full rounded-2xl border-2 border-indigo-600 bg-white px-6 py-4 text-base font-semibold text-indigo-700 active:bg-indigo-50 transition-colors disabled:opacity-60 disabled:pointer-events-none"
      :disabled="savePending"
      @click="emit('save-copy')"
    >
      {{ savePending ? '保存中…' : '保存记录并复制汇报文字' }}
    </button>
    <button
      type="button"
      class="w-full rounded-2xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-md shadow-emerald-600/25 active:bg-emerald-700"
      @click="emit('export-excel')"
    >
      ⬇️ 导出反馈表 (Excel)
    </button>
  </section>
</template>
