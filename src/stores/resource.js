/**
 * 资源库 Pinia Store
 *
 * 响应式管理资源数据，提供 CRUD、筛选、搜索等 actions
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useResource } from '../composables/useResource';

export const useResourceStore = defineStore('resource', () => {
  // ── State ──
  const items = ref([]);
  const loaded = ref(false);

  // ── Getters ──

  /** 所有学科（去重） */
  const subjects = computed(() => {
    const set = new Set();
    for (const r of items.value) {
      if (r.subject) set.add(r.subject);
    }
    return Array.from(set);
  });

  /** 所有年级（去重） */
  const grades = computed(() => {
    const set = new Set();
    for (const r of items.value) {
      if (r.grade) set.add(r.grade);
    }
    return Array.from(set);
  });

  // ── Actions ──

  const resourceApi = useResource();

  /** 加载资源数据 */
  async function load() {
    const list = await resourceApi.getResourceList();
    items.value = list;
    loaded.value = true;
  }

  /**
   * 新增资源项
   * @param {object} item - ResourceItem
   * @returns {Promise<object>}
   */
  async function addItem(item) {
    const saved = await resourceApi.saveResource(item);
    items.value = await resourceApi.getResourceList();
    return saved;
  }

  /**
   * 更新资源项
   * @param {string} id
   * @param {Function} updater - (item) => newItem
   */
  async function updateItem(id, updater) {
    const list = items.value.slice();
    const idx = list.findIndex((it) => it.id === id);
    if (idx < 0) throw new Error('资源不存在');
    const updated = updater(list[idx]);
    await resourceApi.saveResource(updated);
    items.value = await resourceApi.getResourceList();
  }

  /**
   * 删除资源项
   * @param {string} id
   */
  async function removeItem(id) {
    await resourceApi.deleteResource(id);
    items.value = items.value.filter((it) => it.id !== id);
  }

  /**
   * 按条件筛选
   * @param {{subject?:string,grade?:string,type?:string}} filters
   * @returns {Promise<object[]>}
   */
  async function filter(filters) {
    return resourceApi.filterResources(filters);
  }

  /**
   * 模糊搜索
   * @param {string} keyword
   * @returns {Promise<object[]>}
   */
  async function search(keyword) {
    return resourceApi.searchResources(keyword);
  }

  return {
    items,
    loaded,
    subjects,
    grades,
    load,
    addItem,
    updateItem,
    removeItem,
    filter,
    search,
  };
});
