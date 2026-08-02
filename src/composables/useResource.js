/**
 * 资源库数据层 Composable
 *
 * 提供 resource_index_v1 的 CRUD、筛选、搜索
 */
import { useDatabase } from './useDatabase';

export function useResource() {
  const {
    generateRecordId,
    sanitizeResourceItem,
    getResourceList,
    setResourceList,
  } = useDatabase();

  /* ─── CRUD ─── */

  async function getList() {
    return getResourceList();
  }

  async function setList(list) {
    return setResourceList(list);
  }

  /**
   * 保存资源项（新增或更新）
   * @param {object} item - ResourceItem
   * @returns {Promise<object>}
   */
  async function saveResource(item) {
    const now = Date.now();
    const sanitized = sanitizeResourceItem({
      ...item,
      updatedAt: now,
      createdAt: item.createdAt || now,
    });
    if (!sanitized) throw new Error('资源数据无效');
    const list = await getResourceList();
    if (item.id) {
      // 更新
      const idx = list.findIndex((r) => r.id === item.id);
      if (idx >= 0) {
        list[idx] = sanitized;
      } else {
        list.push(sanitized);
      }
    } else {
      // 新增
      list.push(sanitized);
    }
    await setResourceList(list);
    return sanitized;
  }

  /**
   * 删除资源项
   * @param {string} id
   * @returns {Promise<void>}
   */
  async function deleteResource(id) {
    const list = await getResourceList();
    const next = list.filter((r) => r.id !== id);
    await setResourceList(next);
  }

  /* ─── 查询 ─── */

  /**
   * 按条件筛选资源
   * @param {{subject?:string,grade?:string,type?:string}} filters
   * @returns {Promise<object[]>}
   */
  async function filterResources(filters) {
    const list = await getResourceList();
    return list.filter((r) => {
      if (filters.subject && r.subject !== filters.subject) return false;
      if (filters.grade && r.grade !== filters.grade) return false;
      if (filters.type && r.type !== filters.type) return false;
      return true;
    });
  }

  /**
   * 模糊搜索资源（匹配 title + description，大小写不敏感）
   * @param {string} keyword
   * @returns {Promise<object[]>}
   */
  async function searchResources(keyword) {
    const kw = String(keyword || '').trim().toLowerCase();
    if (!kw) return getResourceList();
    const list = await getResourceList();
    return list.filter((r) => {
      const title = String(r.title || '').toLowerCase();
      const desc = String(r.description || '').toLowerCase();
      const subject = String(r.subject || '').toLowerCase();
      return title.includes(kw) || desc.includes(kw) || subject.includes(kw);
    });
  }

  return {
    getResourceList: getList,
    setResourceList: setList,
    sanitizeResourceItem,
    saveResource,
    deleteResource,
    filterResources,
    searchResources,
  };
}
