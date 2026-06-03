<script setup>
import { ref } from 'vue';

defineProps({
  photoHint: {
    type: String,
    default: '尚未选择图片',
  },
  previewUrl: {
    type: String,
    default: '',
  },
  showBatch: {
    type: Boolean,
    default: true,
  },
  requirePhoto: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['pick-photo', 'pick-batch', 'open-batch-import']);
const batchInputRef = ref(null);

function onPhotoChange(e) {
  const file = e.target?.files?.[0] || null;
  emit('pick-photo', file);
}

function onBatchChange(e) {
  const files = Array.from(e.target?.files || []);
  emit('pick-batch', files);
}

function openBatchPicker() {
  emit('open-batch-import');
  if (batchInputRef.value) {
    batchInputRef.value.value = '';
    batchInputRef.value.click();
  }
}
</script>

<template>
  <section class="space-y-2">
    <input
      id="photoInput"
      type="file"
      accept="image/*"
      class="sr-only"
      tabindex="-1"
      aria-label="拍照或从相册选取图片"
      @change="onPhotoChange"
    />
    <label
      for="photoInput"
      class="flex w-full cursor-pointer justify-center rounded-2xl px-6 py-5 text-lg font-semibold text-white shadow-lg active:scale-[0.98] transition-transform"
      :class="
        requirePhoto
          ? 'bg-amber-600 shadow-amber-500/30'
          : 'bg-indigo-600 shadow-indigo-500/30'
      "
    >
      {{ requirePhoto ? '拍照 / 传图（零售课必填）' : '拍照 / 传图' }}
    </label>
    <input
      id="batchPhotoInput"
      ref="batchInputRef"
      type="file"
      accept="image/*"
      multiple
      class="sr-only"
      tabindex="-1"
      aria-label="批量选择图片"
      @change="onBatchChange"
    />
    <button
      v-if="showBatch"
      type="button"
      class="w-full rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 active:bg-indigo-100"
      @click="openBatchPicker"
    >
      批量导入
    </button>
    <p class="text-center text-sm text-slate-500 truncate px-1">
      {{ photoHint }}
    </p>
    <div
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
      :class="previewUrl ? '' : 'hidden'"
    >
      <img
        :src="previewUrl"
        alt="本次所选图片预览"
        class="mx-auto max-h-72 w-full rounded-xl object-contain"
      />
    </div>
  </section>
</template>
