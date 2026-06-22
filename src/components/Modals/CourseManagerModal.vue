<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  courses: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'save']);

const editingList = ref([]);
const newCourseName = ref('');

watch(() => props.visible, (v) => {
  if (v) {
    editingList.value = [...props.courses];
    newCourseName.value = '';
  }
});

function addCourse() {
  const name = String(newCourseName.value || '').trim();
  if (!name) return;
  if (editingList.value.some(c => c.toLowerCase() === name.toLowerCase())) {
    newCourseName.value = '';
    return;
  }
  editingList.value.push(name);
  newCourseName.value = '';
}

function removeCourse(idx) {
  editingList.value.splice(idx, 1);
}

function save() {
  emit('save', [...editingList.value]);
  emit('close');
}

</script>

<template>
  <div
    class="fixed inset-0 z-[170] flex items-center justify-center bg-slate-900/65 p-4"
    :class="visible ? '' : 'hidden'"
    @click="emit('close')"
  >
    <div
      class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4"
      role="dialog"
      aria-modal="true"
      @click.stop
    >
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-900">管理课程分类</h3>
        <button type="button" class="rounded-lg p-1 text-slate-500 hover:bg-slate-100" @click="emit('close')">✕</button>
      </div>

      <div class="flex gap-2">
        <input
          type="text"
          maxlength="100"
          placeholder="输入新课程名…"
          class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          v-model="newCourseName"
          @keydown.enter.prevent="addCourse"
        />
        <button
          type="button"
          class="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white active:bg-indigo-700"
          @click="addCourse"
        >
          添加
        </button>
      </div>

      <ul class="space-y-1 max-h-64 overflow-y-auto">
        <li
          v-for="(c, idx) in editingList"
          :key="idx"
          class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
        >
          <span class="text-sm text-slate-900">{{ c }}</span>
          <button
            type="button"
            class="rounded-md border border-rose-200 bg-white px-2 py-0.5 text-xs text-rose-700 active:bg-rose-50"
            @click="removeCourse(idx)"
          >
            删除
          </button>
        </li>
        <li v-if="!editingList.length" class="text-center text-sm text-slate-400 py-4">
          暂无课程分类
        </li>
      </ul>

      <div class="flex gap-3 pt-1">
        <button type="button" class="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-50" @click="emit('close')">取消</button>
        <button type="button" class="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm active:bg-indigo-700" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>
