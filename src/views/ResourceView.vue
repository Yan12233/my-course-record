<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import ResourceList from '../components/Resource/ResourceList.vue';
import ResourceEditorSheet from '../components/Resource/ResourceEditorSheet.vue';
import { useResourceStore } from '../stores/resource';
import { useUiStore } from '../stores/ui';
import { useDatabase } from '../composables/useDatabase';
import { RESOURCE_TYPES, GRADE_OPTIONS } from '../utils/scheduleConstants';

const resourceStore = useResourceStore();
const ui = useUiStore();
const { getCourseList, generateRecordId } = useDatabase();

// ── 数据 ──
const courseList = ref([]);
const loading = ref(true);

// ── 搜索/筛选 ──
const searchText = ref('');
const filterSubject = ref('');
const filterGrade = ref('');
const filterType = ref('');

// ── 编辑器状态 ──
const editorVisible = ref(false);
const editingItem = ref(null);

// ── 筛选后的列表 ──
const filteredItems = computed(() => {
  let list = resourceStore.items;

  const kw = searchText.value.trim().toLowerCase();
  if (kw) {
    list = list.filter((r) => {
      const title = String(r.title || '').toLowerCase();
      const desc = String(r.description || '').toLowerCase();
      const subject = String(r.subject || '').toLowerCase();
      return title.includes(kw) || desc.includes(kw) || subject.includes(kw);
    });
  }

  if (filterSubject.value) {
    list = list.filter((r) => r.subject === filterSubject.value);
  }
  if (filterGrade.value) {
    list = list.filter((r) => r.grade === filterGrade.value);
  }
  if (filterType.value) {
    list = list.filter((r) => r.type === filterType.value);
  }

  // 按更新时间倒序
  return list.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
});

onMounted(async () => {
  loading.value = true;
  try {
    await resourceStore.load();
    courseList.value = await getCourseList();
  } catch (err) {
    ui.showToast('加载资源失败', 'error');
  } finally {
    loading.value = false;
  }
});

/** 打开资源链接 */
function onOpenResource(item) {
  if (!item.url) {
    ui.showToast('该资源未设置链接', 'error');
    return;
  }
  window.open(item.url, '_blank');
}

/** 新增 */
function onAdd() {
  editingItem.value = null;
  editorVisible.value = true;
}

/** 编辑 */
function onEdit(item) {
  editingItem.value = item;
  editorVisible.value = true;
}

/** 删除 */
async function onDelete(id) {
  try {
    await resourceStore.removeItem(id);
    ui.showToast('已删除', 'success');
  } catch (err) {
    ui.showToast('删除失败', 'error');
  }
}

/** 提交表单 */
async function onEditorSubmit(data) {
  if (data.error) {
    ui.showToast(data.error, 'error');
    return;
  }

  try {
    if (data.id) {
      await resourceStore.updateItem(data.id, (item) => ({
        ...item,
        ...data,
        updatedAt: Date.now(),
      }));
      ui.showToast('资源已更新', 'success');
    } else {
      const newItem = {
        id: generateRecordId(),
        title: data.title,
        subject: data.subject,
        grade: data.grade,
        type: data.type,
        url: data.url,
        description: data.description,
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await resourceStore.addItem(newItem);
      ui.showToast('已添加资源', 'success');
    }
    editorVisible.value = false;
  } catch (err) {
    ui.showToast('保存失败', 'error');
  }
}

/** 清除筛选 */
function clearFilters() {
  searchText.value = '';
  filterSubject.value = '';
  filterGrade.value = '';
  filterType.value = '';
}
</script>

<template>
  <div class="px-4 py-3 pb-6">
    <!-- 加载中 -->
    <div v-if="loading" class="space-y-3 animate-pulse">
      <div class="h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div class="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />
      <div class="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />
    </div>

    <template v-else>
      <!-- 搜索框 -->
      <div class="relative mb-3">
        <input
          v-model="searchText"
          type="text"
          placeholder="🔍 搜索教案/课件..."
          class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>

      <!-- 筛选器 -->
      <div class="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
        <select
          v-model="filterSubject"
          class="flex-shrink-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 outline-none"
        >
          <option value="">全部学科</option>
          <option v-for="c in courseList" :key="c" :value="c">{{ c }}</option>
        </select>
        <select
          v-model="filterGrade"
          class="flex-shrink-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 outline-none"
        >
          <option value="">全部年级</option>
          <option v-for="g in GRADE_OPTIONS" :key="g" :value="g">{{ g }}</option>
        </select>
        <select
          v-model="filterType"
          class="flex-shrink-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 outline-none"
        >
          <option value="">全部类型</option>
          <option v-for="t in RESOURCE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <button
          v-if="searchText || filterSubject || filterGrade || filterType"
          class="flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 underline"
          @click="clearFilters"
        >
          清除
        </button>
      </div>

      <!-- 工具栏 -->
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-slate-400 dark:text-slate-500">共 {{ filteredItems.length }} 条</span>
        <button
          class="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white active:bg-indigo-700 transition-colors"
          @click="onAdd"
        >
          + 新增资源
        </button>
      </div>

      <!-- 资源列表 -->
      <ResourceList
        :items="filteredItems"
        @open="onOpenResource"
        @edit="onEdit"
        @delete="onDelete"
      />
    </template>

    <!-- 编辑器弹窗 -->
    <ResourceEditorSheet
      :visible="editorVisible"
      :editing-item="editingItem"
      :course-suggestions="courseList"
      @close="editorVisible = false"
      @submit="onEditorSubmit"
    />
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
