<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
  hint: { type: String, default: '' },
  envHint: { type: String, default: '' },
});

const emit = defineEmits(['close', 'sent']);
</script>

<template>
  <div
    class="fixed inset-0 z-[180] flex items-center justify-center bg-slate-900/65 p-4"
    :class="visible ? '' : 'hidden'"
    @click="emit('close')"
  >
    <div
      class="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl space-y-3"
      role="dialog"
      aria-modal="true"
      @click.stop
    >
      <p class="text-sm text-slate-700">{{ hint }}</p>
      <p class="text-xs text-slate-500">{{ envHint }}</p>
      <img v-if="imageUrl" :src="imageUrl" alt="保存成功图片" class="max-h-56 w-full rounded-xl object-contain border border-slate-200" />
      <div v-else class="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
        本次记录无图片
      </div>
      <div class="flex gap-2">
        <button type="button" class="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" @click="emit('close')">关闭</button>
        <button type="button" class="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white" @click="emit('sent')">已发送</button>
      </div>
    </div>
  </div>
</template>
