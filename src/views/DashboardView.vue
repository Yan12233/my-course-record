<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import localforage from 'localforage'
import { useScheduleStore } from '../stores/schedule'

const router = useRouter()
const scheduleStore = useScheduleStore()

// ============================================================
// 今日摘要
// ============================================================
const today = computed(() => {
  const d = new Date()
  return {
    weekday: d.toLocaleDateString('zh-CN', { weekday: 'long' }),
    date: d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
  }
})

const todayStats = ref({ lessons: 0, todos: 0, pendingTodos: 0 })

/** 今日排课数（来自 scheduleStore.todayItems） */
const todayScheduleCount = computed(() => scheduleStore.todayItems.length)

async function loadTodayStats() {
  // 待办统计
  const todos = await localforage.getItem('ws_todos') || []
  todayStats.value.todos = todos.length
  todayStats.value.pendingTodos = todos.filter(t => !t.done).length
}

// ============================================================
// 快捷链接
// ============================================================
const links = ref([])
const showAddLink = ref(false)
const newLink = ref({ title: '', url: '', icon: '🔗' })

const iconOptions = ['🔗', '📝', '📊', '📅', '📁', '🎯', '💡', '⭐', '📌', '🏠', '📚', '🔧', '🎨', '📈', '🗂️']

async function loadLinks() {
  const saved = await localforage.getItem('workstation_links_v1')
  if (saved) links.value = saved
}

async function saveLinks() {
  await localforage.setItem('workstation_links_v1', links.value)
}

function addLink() {
  if (!newLink.value.title.trim() || !newLink.value.url.trim()) return
  links.value.push({ ...newLink.value })
  newLink.value = { title: '', url: '', icon: '🔗' }
  showAddLink.value = false
  saveLinks()
}

function removeLink(index) {
  links.value.splice(index, 1)
  saveLinks()
}

function openLink(url) {
  let finalUrl = url
  if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl
  window.open(finalUrl, '_blank')
}

// ============================================================
// 置顶便签
// ============================================================
const stickyNote = ref('')
const editingNote = ref(false)

async function loadStickyNote() {
  const saved = await localforage.getItem('ws_sticky_note')
  if (saved) stickyNote.value = saved
}

async function saveStickyNote() {
  await localforage.setItem('ws_sticky_note', stickyNote.value)
  editingNote.value = false
}

// ============================================================
// 模块入口
// ============================================================
const modules = [
  { id: 'teaching', name: '教培管理', desc: '课程记录 · 排课 · 考勤 · 资源库', icon: '📚', color: 'from-indigo-500 to-blue-600', route: '/teaching' },
  { id: 'todos', name: '待办清单', desc: `${todayStats.value.pendingTodos || 0} 项待完成`, icon: '✅', color: 'from-emerald-500 to-teal-600', route: '/todos' },
  { id: 'countdown', name: '倒计时', desc: '考试 · 项目 · 假期', icon: '⏰', color: 'from-amber-500 to-orange-600', route: '/settings' },
  { id: 'pomodoro', name: '番茄钟', desc: '25 分钟专注', icon: '🍅', color: 'from-rose-500 to-pink-600', route: '/settings' },
]

onMounted(async () => {
  await Promise.all([loadTodayStats(), loadLinks(), loadStickyNote()])
  // 加载排课数据并执行旧课表迁移（如有）
  try {
    await scheduleStore.load()
    await scheduleStore.migrateIfNeeded()
  } catch {
    /* 静默 */
  }
})
</script>

<template>
  <div class="space-y-5 px-4 py-4 pb-6">
    <!-- ====== 头部 ====== -->
    <div class="pt-2">
      <h1 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">我的工作台</h1>
      <p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
        {{ today.weekday }} · {{ today.date }}
      </p>
    </div>

    <!-- ====== 今日摘要卡片 ====== -->
    <div class="grid grid-cols-3 gap-3">
      <div class="rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 p-4 text-center">
        <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{{ todayScheduleCount }}</div>
        <div class="text-xs text-indigo-400 dark:text-indigo-500 mt-1">今日排课</div>
      </div>
      <div class="rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 p-4 text-center">
        <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{{ todayStats.pendingTodos }}</div>
        <div class="text-xs text-emerald-400 dark:text-emerald-500 mt-1">待办事项</div>
      </div>
      <div class="rounded-2xl bg-amber-50 dark:bg-amber-950/50 p-4 text-center">
        <div class="text-2xl font-bold text-amber-600 dark:text-amber-400">{{ todayStats.todos }}</div>
        <div class="text-xs text-amber-400 dark:text-amber-500 mt-1">全部任务</div>
      </div>
    </div>

    <!-- ====== 置顶便签 ====== -->
    <div class="rounded-2xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/40 p-4 shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold text-yellow-600 dark:text-yellow-500 uppercase tracking-wider">
          📌 置顶便签
        </span>
        <button
          v-if="!editingNote"
          class="text-xs text-yellow-600 dark:text-yellow-500 underline underline-offset-2"
          @click="editingNote = true"
        >
          {{ stickyNote ? '编辑' : '写一条' }}
        </button>
        <button
          v-else
          class="text-xs font-medium text-yellow-700 dark:text-yellow-500 bg-yellow-200 dark:bg-yellow-900/60 px-3 py-1 rounded-lg"
          @click="saveStickyNote"
        >
          保存
        </button>
      </div>
      <textarea
        v-if="editingNote"
        v-model="stickyNote"
        class="w-full rounded-xl border border-yellow-300 dark:border-yellow-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-yellow-300 dark:focus:ring-yellow-700 min-h-[60px] resize-none"
        placeholder="今天要记得的事..."
        rows="2"
      />
      <p v-else-if="stickyNote" class="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
        {{ stickyNote }}
      </p>
      <p v-else class="text-sm text-slate-400 dark:text-slate-500 italic">
        点击「写一条」记录备忘...
      </p>
    </div>

    <!-- ====== 快捷模块入口 ====== -->
    <section>
      <h2 class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">功能模块</h2>
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="mod in modules"
          :key="mod.id"
          :class="[
            'relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-200',
            'bg-gradient-to-br ' + mod.color + ' text-white shadow-md active:scale-[0.97]',
          ]"
          @click="router.push(mod.route)"
        >
          <span class="text-3xl block mb-2">{{ mod.icon }}</span>
          <span class="font-semibold text-sm">{{ mod.name }}</span>
          <span class="block text-xs mt-1 opacity-80">{{ mod.desc }}</span>
        </button>
      </div>
    </section>

    <!-- ====== 快捷链接 ====== -->
    <section>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">快捷链接</h2>
        <button
          class="text-xs font-medium text-indigo-600 dark:text-indigo-400 active:text-indigo-800"
          @click="showAddLink = !showAddLink"
        >
          {{ showAddLink ? '取消' : '+ 添加' }}
        </button>
      </div>

      <!-- 添加链接表单 -->
      <div v-if="showAddLink" class="mb-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm space-y-3">
        <div>
          <span class="text-xs text-slate-400 dark:text-slate-500 mb-2 block">选择图标</span>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="icon in iconOptions"
              :key="icon"
              :class="[
                'w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all duration-150',
                newLink.icon === icon
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950 scale-110 shadow-sm'
                  : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700',
              ]"
              @click="newLink.icon = icon"
            >
              {{ icon }}
            </button>
          </div>
        </div>
        <input
          v-model="newLink.title"
          type="text"
          placeholder="链接名称"
          class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        <input
          v-model="newLink.url"
          type="text"
          placeholder="网址（如 baidu.com）"
          class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          @keyup.enter="addLink"
        />
        <button
          class="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white active:bg-indigo-700 transition-colors"
          @click="addLink"
        >
          保存链接
        </button>
      </div>

      <!-- 空状态 -->
      <div v-if="links.length === 0 && !showAddLink" class="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
        <p class="text-slate-400 dark:text-slate-500 text-sm">还没有快捷链接</p>
        <p class="text-slate-300 dark:text-slate-600 text-xs mt-1">点击「+ 添加」收藏常用网站</p>
      </div>

      <!-- 链接网格 -->
      <div v-else class="grid grid-cols-3 gap-3">
        <div
          v-for="(link, idx) in links"
          :key="idx"
          class="group relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-200 active:scale-95 cursor-pointer"
          @click="openLink(link.url)"
        >
          <button
            class="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-100 dark:hover:bg-rose-900 hover:text-rose-600"
            @click.stop="removeLink(idx)"
          >
            ✕
          </button>
          <div class="text-2xl mb-2">{{ link.icon }}</div>
          <div class="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{{ link.title }}</div>
        </div>
      </div>
    </section>
  </div>
</template>
