<script setup>
import { ref, computed, watch } from 'vue';
import { useDatabase } from '../../composables/useDatabase';

const props = defineProps({
  visible: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'apply-template']);

const {
  getLessonTemplates,
  saveLessonTemplate,
  updateLessonTemplate,
  deleteLessonTemplate,
} = useDatabase();

const mode = ref('load'); // 'load' | 'manage'
const templates = ref([]);
const loading = ref(false);

/* ─── 重命名 ─── */
const renamingId = ref(null);
const renameValue = ref('');

/* ─── 新建模板对话框 ─── */
const showNewDialog = ref(false);
const newTemplateName = ref('');
const newTemplateSource = ref(null); // 需要外部传入

/* ─── 删除确认 ─── */
const deletingId = ref(null);

async function loadTemplates() {
  loading.value = true;
  try {
    templates.value = await getLessonTemplates();
  } finally {
    loading.value = false;
  }
}

function openLoadMode() {
  loadTemplates();
}

function switchToManage() {
  mode.value = 'manage';
  loadTemplates();
}

function switchToLoad() {
  mode.value = 'load';
}

watch(() => props.visible, (v) => {
  if (v) {
    loadTemplates();
    /* 检测 App.vue 传递的保存为模板数据 */
    if (window.__templateSource) {
      newTemplateSource.value = { ...window.__templateSource };
      window.__templateSource = null;
      newTemplateName.value = '';
      showNewDialog.value = true;
      mode.value = 'manage';
    }
  }
});

function applyTemplate(tpl) {
  emit('apply-template', tpl);
}

function startRename(tpl) {
  renamingId.value = tpl.id;
  renameValue.value = tpl.name;
}

async function confirmRename() {
  if (!renamingId.value) return;
  const name = String(renameValue.value || '').trim().slice(0, 50);
  if (!name) { renamingId.value = null; return; }
  await updateLessonTemplate(renamingId.value, (old) => ({ ...old, name, updatedAt: Date.now() }));
  renamingId.value = null;
  await loadTemplates();
}

function cancelRename() {
  renamingId.value = null;
}

function requestDelete(id) {
  deletingId.value = id;
}

async function confirmDelete() {
  if (!deletingId.value) return;
  await deleteLessonTemplate(deletingId.value);
  deletingId.value = null;
  await loadTemplates();
}

function cancelDelete() {
  deletingId.value = null;
}

/* ─── 新建 ─── */
function openNewDialog(sourceData) {
  newTemplateSource.value = sourceData;
  newTemplateName.value = '';
  showNewDialog.value = true;
}

async function confirmNew() {
  const name = String(newTemplateName.value || '').trim().slice(0, 50);
  if (!name) return;
  const now = Date.now();
  await saveLessonTemplate({
    id: undefined,
    name,
    course: newTemplateSource.value?.course || '',
    lessonSchedule: newTemplateSource.value?.lessonSchedule || '',
    lessonType: newTemplateSource.value?.lessonType || 'regular',
    classHours: newTemplateSource.value?.classHours || '',
    feeRate: newTemplateSource.value?.feeRate || '',
    headCount: newTemplateSource.value?.headCount || '1',
    students: Array.isArray(newTemplateSource.value?.students)
      ? newTemplateSource.value.students.map(s => typeof s === 'string' ? s : (s.name || ''))
      : [],
    teacher: newTemplateSource.value?.teacher || '',
    courseContent: newTemplateSource.value?.courseContent || '',
    createdAt: now,
    updatedAt: now,
  });
  showNewDialog.value = false;
  await loadTemplates();
}

function cancelNew() {
  showNewDialog.value = false;
}

function close() {
  mode.value = 'load';
  loading.value = false;
  emit('close');
}
</script>

<template>
  <div
    class="fixed inset-0 z-[160] flex items-stretch justify-center bg-slate-900/65 p-0 sm:p-4"
    :class="visible ? '' : 'hidden'"
    @click="close"
  >
    <div
      class="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl"
      role="dialog"
      aria-modal="true"
      @click.stop
    >
      <div class="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <h2 class="text-lg font-semibold text-slate-900">
          {{ mode === 'manage' ? '管理模板' : '加载模板' }}
        </h2>
        <button type="button" class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" @click="close">✕</button>
      </div>

      <div class="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <p v-if="loading" class="text-center text-sm text-slate-400 py-4">加载中…</p>

        <template v-if="!loading">
          <!-- 空状态 -->
          <div v-if="!templates.length" class="text-center py-8">
            <p class="text-sm text-slate-400 mb-3">暂无模板</p>
            <p class="text-xs text-slate-400">在编辑课程时，点击「保存为模板」即可创建</p>
          </div>

          <!-- 模板列表 -->
          <ul v-else class="space-y-2">
            <li
              v-for="tpl in templates"
              :key="tpl.id"
              class="rounded-xl border border-slate-200 bg-white p-3"
            >
              <!-- 重命名模式 -->
              <template v-if="renamingId === tpl.id">
                <div class="flex gap-2 mb-2">
                  <input
                    type="text"
                    maxlength="50"
                    class="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                    v-model="renameValue"
                    @keydown.enter.prevent="confirmRename"
                  />
                  <button
                    type="button"
                    class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white"
                    @click="confirmRename"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600"
                    @click="cancelRename"
                  >
                    取消
                  </button>
                </div>
              </template>

              <!-- 正常显示 -->
              <template v-else>
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-slate-900 truncate">{{ tpl.name }}</p>
                    <div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      <span>{{ tpl.course || '无课程' }}</span>
                      <span v-if="tpl.lessonSchedule">{{ tpl.lessonSchedule }}</span>
                      <span>{{ tpl.lessonType === 'retail' ? '零售' : '常规' }}</span>
                      <span v-if="tpl.classHours">{{ tpl.classHours }}h</span>
                      <span v-if="tpl.feeRate">¥{{ tpl.feeRate }}<template v-if="tpl.lessonType !== 'retail'">/h</template></span>
                      <span v-if="tpl.lessonType === 'retail' && tpl.headCount">{{ tpl.headCount }}人</span>
                      <span v-if="Array.isArray(tpl.students) && tpl.students.length">
                        {{ tpl.students.slice(0, 4).join('、') }}{{ tpl.students.length > 4 ? '…' : '' }}
                      </span>
                    </div>
                  </div>

                  <!-- 操作按钮 -->
                  <div class="flex shrink-0 gap-1">
                    <!-- 加载模式：应用 -->
                    <button
                      v-if="mode === 'load'"
                      type="button"
                      class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white"
                      @click="applyTemplate(tpl)"
                    >
                      应用
                    </button>
                    <!-- 管理模式：编辑/删除 -->
                    <template v-if="mode === 'manage'">
                      <button
                        type="button"
                        class="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-600"
                        @click="startRename(tpl)"
                      >
                        重命名
                      </button>
                      <button
                        type="button"
                        class="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1.5 text-xs text-rose-700"
                        @click="requestDelete(tpl.id)"
                      >
                        删除
                      </button>
                    </template>
                  </div>
                </div>
              </template>
            </li>
          </ul>
        </template>
      </div>

      <!-- 底部切换/管理按钮 -->
      <div class="border-t border-slate-200 px-4 py-3 flex gap-2 justify-between">
        <button
          v-if="mode === 'load' && templates.length"
          type="button"
          class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs text-slate-600"
          @click="switchToManage"
        >
          管理模板
        </button>
        <button
          v-if="mode === 'manage'"
          type="button"
          class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs text-slate-600"
          @click="switchToLoad"
        >
          « 返回加载
        </button>
      </div>
    </div>
  </div>

  <!-- 删除确认弹窗 -->
  <div
    class="fixed inset-0 z-[170] flex items-center justify-center bg-slate-900/65 p-4"
    :class="deletingId ? '' : 'hidden'"
    @click="cancelDelete"
  >
    <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" @click.stop>
      <h3 class="text-lg font-semibold text-slate-900">确认删除</h3>
      <p class="text-sm text-slate-600">删除后无法恢复，确定要删除此模板吗？</p>
      <div class="flex gap-3">
        <button type="button" class="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-50" @click="cancelDelete">取消</button>
        <button type="button" class="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-sm active:bg-rose-700" @click="confirmDelete">确认删除</button>
      </div>
    </div>
  </div>

  <!-- 新建模板对话框 -->
  <div
    class="fixed inset-0 z-[180] flex items-center justify-center bg-slate-900/65 p-4"
    :class="showNewDialog ? '' : 'hidden'"
    @click="cancelNew"
  >
    <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" @click.stop>
      <h3 class="text-lg font-semibold text-slate-900">保存为模板</h3>
      <label class="block space-y-1">
        <span class="text-sm text-slate-600">模板名称</span>
        <input
          type="text"
          maxlength="50"
          placeholder="例如：C++ 周六下午班"
          class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          v-model="newTemplateName"
          @keydown.enter.prevent="confirmNew"
        />
      </label>
      <div v-if="newTemplateSource" class="rounded-lg bg-slate-50 p-2 text-xs text-slate-500 space-y-0.5">
        <p>课程：{{ newTemplateSource.course || '—' }}</p>
        <p>时间：{{ newTemplateSource.lessonSchedule || '—' }}</p>
        <p>类型：{{ newTemplateSource.lessonType === 'retail' ? '零售' : '常规' }}</p>
        <p v-if="newTemplateSource.students && newTemplateSource.students.length">
          学生：{{ newTemplateSource.students.join('、') }}
        </p>
      </div>
      <div class="flex gap-3">
        <button type="button" class="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-50" @click="cancelNew">取消</button>
        <button type="button" class="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm active:bg-indigo-700" :disabled="!newTemplateName.trim()" @click="confirmNew">保存</button>
      </div>
    </div>
  </div>
</template>
