<script setup>
import { ref, watch } from 'vue';
import { GRADE_OPTIONS, RESOURCE_TYPES } from '../../utils/scheduleConstants';

const props = defineProps({
  visible: { type: Boolean, default: false },
  editingItem: { type: Object, default: null },
  courseSuggestions: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'submit']);

const form = ref({
  title: '',
  subject: '',
  grade: '',
  type: 'lesson_plan',
  url: '',
  description: '',
});

const isEditing = ref(false);

function initForm() {
  if (props.editingItem) {
    isEditing.value = true;
    form.value = {
      title: props.editingItem.title || '',
      subject: props.editingItem.subject || '',
      grade: props.editingItem.grade || '',
      type: props.editingItem.type || 'lesson_plan',
      url: props.editingItem.url || '',
      description: props.editingItem.description || '',
    };
  } else {
    isEditing.value = false;
    form.value = {
      title: '',
      subject: '',
      grade: '',
      type: 'lesson_plan',
      url: '',
      description: '',
    };
  }
}

watch(() => props.visible, (v) => {
  if (v) initForm();
});

watch(() => props.editingItem, () => {
  if (props.visible) initForm();
}, { deep: true });

function onSubmit() {
  const title = String(form.value.title || '').trim();
  if (!title) {
    emit('submit', { error: '请输入资源标题' });
    return;
  }
  const url = String(form.value.url || '').trim();
  if (url && !/^https?:\/\//i.test(url)) {
    emit('submit', { error: '链接需以 http:// 或 https:// 开头' });
    return;
  }

  emit('submit', {
    id: props.editingItem?.id || '',
    title,
    subject: String(form.value.subject || '').trim(),
    grade: String(form.value.grade || '').trim(),
    type: form.value.type,
    url,
    description: String(form.value.description || '').trim(),
    createdAt: props.editingItem?.createdAt || Date.now(),
  });
}
</script>

<template>
  <div
    class="fixed inset-0 z-[170] flex items-stretch justify-center bg-slate-900/65"
    :class="visible ? '' : 'hidden'"
    @click="emit('close')"
  >
    <div
      class="absolute bottom-0 w-full max-w-md max-h-[88dvh] overflow-y-auto rounded-t-2xl bg-white dark:bg-slate-800 shadow-2xl"
      @click.stop
    >
      <!-- Header -->
      <div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
        <h2 class="text-base font-semibold text-slate-900 dark:text-white">
          {{ isEditing ? '编辑资源' : '新增资源' }}
        </h2>
        <button
          type="button"
          class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Form -->
      <div class="px-4 py-4 space-y-4">
        <!-- 标题 -->
        <div>
          <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">标题</label>
          <input
            v-model="form.title"
            type="text"
            maxlength="100"
            placeholder="如：Python循环结构教案"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        <!-- 学科 -->
        <div>
          <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">学科</label>
          <select
            v-model="form.subject"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
          >
            <option value="">选择学科…</option>
            <option v-for="course in courseSuggestions" :key="course" :value="course">{{ course }}</option>
          </select>
        </div>

        <!-- 年级 -->
        <div>
          <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">年级</label>
          <select
            v-model="form.grade"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
          >
            <option value="">选择年级…</option>
            <option v-for="grade in GRADE_OPTIONS" :key="grade" :value="grade">{{ grade }}</option>
          </select>
        </div>

        <!-- 类型 -->
        <div>
          <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">类型</label>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="t in RESOURCE_TYPES"
              :key="t.value"
              type="button"
              class="rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
              :class="form.type === t.value
                ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400'"
              @click="form.type = t.value"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- 链接 -->
        <div>
          <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">链接 URL</label>
          <input
            v-model="form.url"
            type="text"
            maxlength="500"
            placeholder="https://kdocs.cn/..."
            class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">粘贴金山文档或其他在线文档链接</p>
        </div>

        <!-- 备注 -->
        <div>
          <label class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">备注</label>
          <textarea
            v-model="form.description"
            maxlength="2000"
            rows="3"
            placeholder="资源简介、使用说明等"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
          />
        </div>
      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
        <button
          type="button"
          class="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white active:bg-indigo-700 transition-colors"
          @click="onSubmit"
        >
          {{ isEditing ? '保存修改' : '添加资源' }}
        </button>
      </div>
    </div>
  </div>
</template>
