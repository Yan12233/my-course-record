<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '../stores/ui'
import localforage from 'localforage'

const router = useRouter()
const ui = useUiStore()

// ============================================================
// 深色模式
// ============================================================
const themeOptions = [
  { value: 'light', label: '浅色', icon: 'sun' },
  { value: 'dark', label: '深色', icon: 'moon' },
  { value: 'system', label: '跟随系统', icon: 'monitor' },
]

// ============================================================
// 模块开关
// ============================================================
const moduleItems = [
  { key: 'teaching', label: '教培管理', desc: '课程记录、课时统计、积分管理' },
  { key: 'todos', label: '待办清单', desc: '任务管理、优先级、截止日期' },
  { key: 'countdown', label: '倒计时', desc: '考试 / 项目 / 假期倒计时' },
  { key: 'pomodoro', label: '番茄钟', desc: '25 分钟专注计时器' },
]

// ============================================================
// 倒计时
// ============================================================
const countdowns = ref([])
const showAddCountdown = ref(false)
const newCountdown = ref({ title: '', targetDate: '', icon: '🎯' })

const cdIcons = ['🎯', '📅', '🎓', '✈️', '🏖️', '🎂', '💼', '🏆', '🎄', '⏰']

async function loadCountdowns() {
  const saved = await localforage.getItem('ws_countdowns')
  if (saved) countdowns.value = saved
}
async function saveCountdowns() {
  await localforage.setItem('ws_countdowns', countdowns.value)
}

function addCountdown() {
  if (!newCountdown.value.title.trim() || !newCountdown.value.targetDate) return
  countdowns.value.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ...newCountdown.value,
  })
  newCountdown.value = { title: '', targetDate: '', icon: '🎯' }
  showAddCountdown.value = false
  saveCountdowns()
}

function removeCountdown(id) {
  countdowns.value = countdowns.value.filter(c => c.id !== id)
  saveCountdowns()
}

function daysUntil(dateStr) {
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

// ============================================================
// 番茄钟
// ============================================================
const POMODORO_WORK = 25 * 60
const POMODORO_BREAK = 5 * 60

const pomodoroState = ref('idle') // 'idle' | 'work' | 'break'
const pomodoroSeconds = ref(POMODORO_WORK)
const pomodoroTotal = ref(POMODORO_WORK)
const pomodoroLabel = ref('专注')
const pomodoroRounds = ref(0)
let pomodoroTimer = null

const pomodoroDisplay = computed(() => {
  const m = Math.floor(pomodoroSeconds.value / 60)
  const s = pomodoroSeconds.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const pomodoroProgress = computed(() => {
  return 1 - pomodoroSeconds.value / pomodoroTotal.value
})

function startPomodoro() {
  if (pomodoroState.value === 'idle') {
    pomodoroState.value = 'work'
    pomodoroSeconds.value = POMODORO_WORK
    pomodoroTotal.value = POMODORO_WORK
    pomodoroLabel.value = '专注中'
  }
  runPomodoro()
}

function runPomodoro() {
  clearInterval(pomodoroTimer)
  pomodoroTimer = setInterval(() => {
    if (pomodoroSeconds.value <= 0) {
      clearInterval(pomodoroTimer)
      if (pomodoroState.value === 'work') {
        pomodoroRounds.value++
        pomodoroState.value = 'break'
        pomodoroSeconds.value = POMODORO_BREAK
        pomodoroTotal.value = POMODORO_BREAK
        pomodoroLabel.value = '休息一下'
        if (Notification.permission === 'granted') {
          new Notification('番茄钟', { body: '专注结束！休息 5 分钟吧 ☕' })
        }
      } else {
        pomodoroState.value = 'idle'
        pomodoroLabel.value = '完成一轮'
        if (Notification.permission === 'granted') {
          new Notification('番茄钟', { body: `完成 ${pomodoroRounds.value} 轮！太棒了 🎉` })
        }
        return
      }
      runPomodoro()
      return
    }
    pomodoroSeconds.value--
  }, 1000)
}

function resetPomodoro() {
  clearInterval(pomodoroTimer)
  pomodoroState.value = 'idle'
  pomodoroSeconds.value = POMODORO_WORK
  pomodoroTotal.value = POMODORO_WORK
  pomodoroLabel.value = '专注'
}

function requestNotification() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

// ============================================================
// 数据备份
// ============================================================
async function exportAllData() {
  try {
    const keys = await localforage.keys()
    const data = {}
    for (const key of keys) {
      data[key] = await localforage.getItem(key)
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workstation-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    ui.showToast('数据导出成功', 'success')
  } catch {
    ui.showToast('导出失败，请重试', 'error')
  }
}

// ============================================================
// 生命周期
// ============================================================
onMounted(() => {
  loadCountdowns()
})

onBeforeUnmount(() => {
  clearInterval(pomodoroTimer)
})
</script>

<template>
  <div class="space-y-5 px-4 py-4 pb-6">
    <!-- ====== 头部 ====== -->
    <div class="pt-2">
      <h1 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">我的</h1>
      <p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5">设置 · 小工具 · 数据管理</p>
    </div>

    <!-- ====== 深色模式 ====== -->
    <section>
      <h2 class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">外观</h2>
      <div class="flex gap-2">
        <button
          v-for="opt in themeOptions" :key="opt.value"
          :class="[
            'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200',
            ui.theme === opt.value
              ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950 shadow-sm'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
          ]"
          @click="ui.setTheme(opt.value)"
        >
          <svg v-if="opt.icon === 'sun'" class="w-5 h-5" :class="ui.theme === opt.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else-if="opt.icon === 'moon'" class="w-5 h-5" :class="ui.theme === opt.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <svg v-else class="w-5 h-5" :class="ui.theme === opt.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <span class="text-xs font-medium" :class="ui.theme === opt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'">{{ opt.label }}</span>
        </button>
      </div>
    </section>

    <!-- ====== 番茄钟 ====== -->
    <section v-if="ui.moduleToggles.pomodoro">
      <h2 class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">🍅 番茄钟</h2>
      <div
        :class="[
          'rounded-2xl border p-6 text-center transition-all duration-300',
          pomodoroState === 'work' ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30' :
          pomodoroState === 'break' ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30' :
          'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
        ]"
      >
        <!-- 圆环进度 -->
        <div class="relative w-32 h-32 mx-auto mb-4">
          <svg class="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor"
              class="text-slate-200 dark:text-slate-700" stroke-width="6" />
            <circle cx="50" cy="50" r="42" fill="none"
              :class="pomodoroState === 'work' ? 'text-rose-500' : pomodoroState === 'break' ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'"
              stroke="currentColor" stroke-width="6" stroke-linecap="round"
              :stroke-dasharray="2 * Math.PI * 42"
              :stroke-dashoffset="2 * Math.PI * 42 * (1 - pomodoroProgress)"
              class="transition-all duration-1000" />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-2xl font-bold tracking-tight text-slate-800 dark:text-white font-mono">
              {{ pomodoroDisplay }}
            </span>
            <span class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{{ pomodoroLabel }}</span>
          </div>
        </div>

        <div class="flex items-center justify-center gap-3">
          <button
            v-if="pomodoroState === 'idle'"
            class="rounded-xl bg-rose-500 px-6 py-2.5 text-sm font-semibold text-white active:bg-rose-600 transition-colors shadow-md shadow-rose-200 dark:shadow-rose-950"
            @click="startPomodoro(); requestNotification()"
          >开始专注</button>
          <button
            v-else
            class="rounded-xl bg-slate-200 dark:bg-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 active:bg-slate-300 dark:active:bg-slate-600 transition-colors"
            @click="resetPomodoro"
          >重置</button>
        </div>

        <p v-if="pomodoroRounds > 0" class="text-xs text-slate-400 dark:text-slate-500 mt-3">
          已完成 {{ pomodoroRounds }} 轮
        </p>
      </div>
    </section>

    <!-- ====== 倒计时 ====== -->
    <section v-if="ui.moduleToggles.countdown">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">⏰ 倒计时</h2>
        <button
          class="text-xs font-medium text-indigo-600 dark:text-indigo-400"
          @click="showAddCountdown = !showAddCountdown"
        >{{ showAddCountdown ? '取消' : '+ 添加' }}</button>
      </div>

      <!-- 新建表单 -->
      <div v-if="showAddCountdown" class="mb-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm space-y-3">
        <div>
          <span class="text-xs text-slate-400 dark:text-slate-500 mb-1.5 block">图标</span>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="icon in cdIcons" :key="icon"
              :class="[
                'w-9 h-9 rounded-xl text-base flex items-center justify-center border transition-all',
                newCountdown.icon === icon
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950 scale-110 shadow-sm'
                  : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700',
              ]"
              @click="newCountdown.icon = icon"
            >{{ icon }}</button>
          </div>
        </div>
        <input
          v-model="newCountdown.title"
          type="text"
          placeholder="事件名称（如：期末考试）"
          class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900 placeholder:text-slate-400"
        />
        <input
          v-model="newCountdown.targetDate"
          type="date"
          class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900"
        />
        <button
          class="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white active:bg-amber-600 transition-colors"
          @click="addCountdown"
        >添加倒计时</button>
      </div>

      <div v-if="countdowns.length === 0 && !showAddCountdown" class="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
        <p class="text-slate-400 dark:text-slate-500 text-sm">还没有倒计时</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="cd in countdowns"
          :key="cd.id"
          class="group relative flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm"
        >
          <span class="text-2xl">{{ cd.icon }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{{ cd.title }}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500">{{ cd.targetDate }}</p>
          </div>
          <div class="text-right shrink-0">
            <div class="text-lg font-bold"
              :class="daysUntil(cd.targetDate) <= 0 ? 'text-rose-500' :
                      daysUntil(cd.targetDate) <= 7 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'"
            >
              {{ daysUntil(cd.targetDate) <= 0 ? '已过' : daysUntil(cd.targetDate) }}
            </div>
            <div class="text-[10px] text-slate-400 dark:text-slate-500">
              {{ daysUntil(cd.targetDate) <= 0 ? '期' : '天' }}
            </div>
          </div>
          <button
            class="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-100 dark:hover:bg-rose-900 hover:text-rose-500"
            @click="removeCountdown(cd.id)"
          >✕</button>
        </div>
      </div>
    </section>

    <!-- ====== 数据管理 ====== -->
    <section>
      <h2 class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">数据</h2>
      <div class="space-y-2">
        <button
          class="w-full flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm active:scale-[0.99] transition-all"
          @click="exportAllData"
        >
          <div class="flex items-center gap-3">
            <span class="text-lg">💾</span>
            <div class="text-left">
              <p class="text-sm font-medium text-slate-800 dark:text-slate-200">导出全部数据</p>
              <p class="text-xs text-slate-400 dark:text-slate-500">备份为 JSON 文件</p>
            </div>
          </div>
          <svg class="w-5 h-5 text-slate-300 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <button
          class="w-full flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm active:scale-[0.99] transition-all"
          @click="router.push('/teaching')"
        >
          <div class="flex items-center gap-3">
            <span class="text-lg">☁️</span>
            <div class="text-left">
              <p class="text-sm font-medium text-slate-800 dark:text-slate-200">云同步设置</p>
              <p class="text-xs text-slate-400 dark:text-slate-500">WebDAV 自动备份</p>
            </div>
          </div>
          <svg class="w-5 h-5 text-slate-300 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </section>

    <!-- ====== 模块开关 ====== -->
    <section>
      <h2 class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">模块管理</h2>
      <div class="space-y-2">
        <div
          v-for="mod in moduleItems"
          :key="mod.key"
          class="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm"
        >
          <div>
            <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ mod.label }}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500">{{ mod.desc }}</p>
          </div>
          <button
            :class="[
              'relative w-12 h-7 rounded-full transition-colors duration-200',
              ui.moduleToggles[mod.key] ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600',
            ]"
            @click="ui.toggleModule(mod.key)"
          >
            <span
              :class="[
                'absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200',
                ui.moduleToggles[mod.key] ? 'translate-x-[22px]' : 'translate-x-0.5',
              ]"
            />
          </button>
        </div>
      </div>
    </section>

    <!-- ====== 版本信息 ====== -->
    <div class="text-center pt-2 pb-4">
      <p class="text-xs text-slate-300 dark:text-slate-700">教师个人工作台 v2.0</p>
    </div>
  </div>
</template>
