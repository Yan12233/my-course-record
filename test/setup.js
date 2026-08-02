/**
 * 测试环境初始化
 *
 * 使用内存 Map 模拟 localforage (IndexedDB)，使 composables 可在 Node 测试环境中运行
 */
import { vi, beforeEach } from 'vitest'

// ── 内存存储 ──
const memoryStore = new Map()

// ── 模拟 localforage ──
const localforageMock = {
  config(opts) {
    this._config = opts
    return true
  },
  async getItem(key) {
    return memoryStore.has(key) ? structuredClone(memoryStore.get(key)) : null
  },
  async setItem(key, value) {
    memoryStore.set(key, structuredClone(value))
    return value
  },
  async removeItem(key) {
    memoryStore.delete(key)
  },
  async clear() {
    memoryStore.clear()
  },
  async keys() {
    return Array.from(memoryStore.keys())
  },
}

// 替换全局 localforage
vi.mock('localforage', () => ({
  default: localforageMock,
}))

// ── 模拟 window 全局对象（generateRecordId 依赖 window.crypto） ──
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {}
}
if (!globalThis.window.crypto) {
  globalThis.window.crypto = {}
}
if (typeof globalThis.window.crypto.randomUUID !== 'function') {
  globalThis.window.crypto.randomUUID = () =>
    'test-uuid-' + Math.random().toString(36).slice(2, 11)
}
if (!globalThis.crypto) {
  globalThis.crypto = globalThis.window.crypto
}

// 每个测试前清空存储
beforeEach(() => {
  memoryStore.clear()
})

// 导出供测试直接操作
export { memoryStore }
