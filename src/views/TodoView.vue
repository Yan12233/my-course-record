<script setup>
import { ref, onMounted, computed } from 'vue'
import localforage from 'localforage'

// ============================================================
// 状态
// ============================================================
const todos = ref([])
const newTask = ref('')
const newPriority = ref('medium')
const newDueDate = ref('')
const newTag = ref('work')
const showForm = ref(false)
const filterTag = ref('all')
const filterStatus = ref('all')

const priorities = [
  { value: 'high', label: '高', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400', dot: 'bg-rose-500' },
  { value: 'medium', label: '中', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400', dot: 'bg-amber-500' },
  { value: 'low', label: '低', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', dot: 'bg-slate-400' },
]

const tags = [
  { value: 'work', label: '工作', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  { value: 'personal', label: '个人', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400' },
  { value: 'study', label: '学习', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
]

const filterTags = ['all', ...tags.map(t => t.value)]
const filterStatuses = ['all', 'pending', 'done']

// ============================================================
// 数据持久化
// ============================================================
async function loadTodos() {
  const saved = await localforage.getItem('ws_todos')
  if (saved) todos.value = saved
}
async function saveTodos() {
  await localforage.setItem('ws_todos', todos.value)
}

// ============================================================
// CRUD
// ============================================================
function addTodo() {
  if (!newTask.value.trim()) return
  todos.value.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: newTask.value.trim(),
    priority: newPriority.value,
    dueDate: newDueDate.value,
    tag: newTag.value,
    done: false,
    createdAt: new Date().toISOString(),
  })
  newTask.value = ''
  newDueDate.value = ''
  showForm.value = false
  saveTodos()
}

function toggleDone(todo) {
  todo.done = !todo.done
  saveTodos()
}

function removeTodo(id) {
  todos.value = todos.value.filter(t => t.id !== id)
  saveTodos()
}

// ============================================================
// 日期状态
// ============================================================
function isOverdue(dateStr) {
  if (!dateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dateStr) < today
}

function formatDueDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (d.getTime() === today.getTime()) return '今天'
  if (d.getTime() === tomorrow.getTime()) return '明天'
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// ============================================================
// 过滤
// ============================================================
const filteredTodos = computed(() => {
  let list = todos.value
  if (filterTag.value !== 'all') {
    list = list.filter(t => t.tag === filterTag.value)
  }
  if (filterStatus.value === 'pending') {
    list = list.filter(t => !t.done)
  } else if (filterStatus.value === 'done') {
    list = list.filter(t => t.done)
  }
  return list
})

const stats = computed(() => ({
  total: todos.value.length,
  pending: todos.value.filter(t => !t.done).length,
  done: todos.value.filter(t => t.done).length,
  overdue: todos.value.filter(t => !t.done && isOverdue(t.dueDate)).length,
}))

function getPriority(p) {
  return priorities.find(pr => pr.value === p) || priorities[1]
}
function getTag(t) {
  return tags.find(tg => tg.value === t) || tags[2]
}

onMounted(loadTodos)
</script>

<template>
  <div class="space-y-4 px-4 py-4 pb-6">
    <!-- ====== 头部 ====== -->
    <div class="flex items-center justify-between pt-2">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">待办清单</h1>
        <p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
          {{ stats.pending }} 项待完成 · {{ stats.overdue }} 项已过期
        </p>
      </div>
      <button
        class="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 dark:shadow-indigo-950"
        @click="showForm = !showForm"
      >
        {{ showForm ? '收起' : '+ 新建' }}
      </button>
    </div>

    <!-- ====== 新建表单 ====== -->
    <div v-if="showForm" class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3 shadow-sm">
      <input
        v-model="newTask"
        type="text"
        placeholder="输入任务内容..."
        class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 placeholder:text-slate-400"
        @keyup.enter="addTodo"
      />

      <!-- 优先级 -->
      <div>
        <span class="text-xs text-slate-400 dark:text-slate-500 mb-1.5 block">优先级</span>
        <div class="flex gap-2">
          <button
            v-for="p in priorities" :key="p.value"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
              newPriority === p.value ? p.color + ' ring-2 ring-offset-1 ring-current' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
            ]"
            @click="newPriority = p.value"
          >{{ p.label }}</button>
        </div>
      </div>

      <!-- 标签 -->
      <div>
        <span class="text-xs text-slate-400 dark:text-slate-500 mb-1.5 block">分类</span>
        <div class="flex gap-2">
          <button
            v-for="t in tags" :key="t.value"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
              newTag === t.value ? t.color + ' ring-2 ring-offset-1 ring-current' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
            ]"
            @click="newTag = t.value"
          >{{ t.label }}</button>
        </div>
      </div>

      <!-- 截止日期 -->
      <div>
        <span class="text-xs text-slate-400 dark:text-slate-500 mb-1.5 block">截止日期（可选）</span>
        <input
          v-model="newDueDate"
          type="date"
          class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
        />
      </div>

      <button
        class="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white active:bg-indigo-700 transition-colors"
        @click="addTodo"
      >
        添加任务
      </button>
    </div>

    <!-- ====== 过滤栏 ====== -->
    <div class="flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="s in filterStatuses" :key="s"
        :class="[
          'px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all',
          filterStatus === s
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
        ]"
        @click="filterStatus = s"
      >{{ s === 'all' ? '全部' : s === 'pending' ? '待完成' : '已完成' }}</button>
      <span class="w-px bg-slate-200 dark:bg-slate-700 self-stretch mx-0.5" />
      <button
        v-for="t in filterTags" :key="t"
        :class="[
          'px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all',
          filterTag === t
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
        ]"
        @click="filterTag = t"
      >{{ t === 'all' ? '全部分类' : tags.find(x => x.value === t)?.label }}</button>
    </div>

    <!-- ====== 任务列表 ====== -->
    <!-- 空状态 -->
    <div v-if="filteredTodos.length === 0" class="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
      <div class="text-4xl mb-3">✅</div>
      <p class="text-slate-400 dark:text-slate-500 text-sm">
        {{ todos.length === 0 ? '还没有待办事项' : '没有匹配的任务' }}
      </p>
      <p class="text-slate-300 dark:text-slate-600 text-xs mt-1">
        {{ todos.length === 0 ? '点击右上角「+ 新建」添加第一个' : '试试调整筛选条件' }}
      </p>
    </div>

    <!-- 任务卡片 -->
    <TransitionGroup name="list" tag="div" class="space-y-2">
      <div
        v-for="todo in filteredTodos"
        :key="todo.id"
        :class="[
          'group relative rounded-2xl border p-4 transition-all duration-200 active:scale-[0.99]',
          todo.done
            ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'
            : isOverdue(todo.dueDate)
              ? 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm',
        ]"
      >
        <div class="flex items-start gap-3">
          <!-- 勾选 -->
          <button
            :class="[
              'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200',
              todo.done
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400',
            ]"
            @click="toggleDone(todo)"
          >
            <svg v-if="todo.done" class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>

          <div class="flex-1 min-w-0">
            <!-- 内容 -->
            <p
              :class="[
                'text-sm leading-relaxed',
                todo.done ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200',
              ]"
            >{{ todo.text }}</p>

            <!-- 元信息行 -->
            <div class="flex items-center gap-2 mt-2 flex-wrap">
              <!-- 优先级 -->
              <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium', getPriority(todo.priority).color]">
                <span class="w-1.5 h-1.5 rounded-full" :class="getPriority(todo.priority).dot" />
                {{ getPriority(todo.priority).label }}
              </span>

              <!-- 分类 -->
              <span :class="['px-2 py-0.5 rounded-lg text-[10px] font-medium', getTag(todo.tag).color]">
                {{ getTag(todo.tag).label }}
              </span>

              <!-- 截止日期 -->
              <span
                v-if="todo.dueDate"
                :class="[
                  'text-[10px] font-medium',
                  todo.done ? 'text-slate-400 dark:text-slate-500' :
                  isOverdue(todo.dueDate) ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400',
                ]"
              >
                {{ isOverdue(todo.dueDate) && !todo.done ? '⚠️ ' : '📅 ' }}{{ formatDueDate(todo.dueDate) }}
              </span>
            </div>
          </div>

          <!-- 删除 -->
          <button
            class="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 opacity-0 group-hover:opacity-100 transition-all"
            @click="removeTodo(todo.id)"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
.list-move {
  transition: transform 0.3s ease;
}
</style>
