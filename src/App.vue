<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from './stores/ui'
import PWAInstallPrompt from './components/PWAInstallPrompt.vue'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()

const tabs = [
  { path: '/', name: 'dashboard', label: '工作台', icon: 'layout-dashboard' },
  { path: '/teaching', name: 'teaching', label: '教学', icon: 'book-open' },
  { path: '/todos', name: 'todos', label: '待办', icon: 'check-square' },
  { path: '/settings', name: 'settings', label: '我的', icon: 'user' },
]

const activeTab = computed(() => (route.meta.tab) || 'dashboard')

function navigateTo(tab) {
  router.push(tab.path)
}
</script>

<template>
  <div class="mx-auto max-w-md min-h-[100dvh] flex flex-col bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-300">
    <!-- 主内容区 -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden"
         style="padding-top: env(safe-area-inset-top)">
      <router-view v-slot="{ Component }">
        <Transition name="page-slide" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </div>

    <!-- PWA 安装引导（底部 Tab 上方） -->
    <PWAInstallPrompt />

    <!-- 底部 TabBar -->
    <nav
      class="sticky bottom-0 z-50 border-t border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-1"
      style="padding-bottom: max(0.25rem, env(safe-area-inset-bottom))"
    >
      <div class="flex">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          :class="[
            'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-all duration-200 rounded-xl mx-0.5',
            activeTab === tab.name
              ? 'text-indigo-600 dark:text-indigo-400 scale-105'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400',
          ]"
          @click="navigateTo(tab)"
        >
          <!-- SVG Icons inline to avoid external deps -->
          <svg v-if="tab.icon === 'layout-dashboard'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1.5"/>
            <rect x="14" y="3" width="7" height="5" rx="1.5"/>
            <rect x="14" y="12" width="7" height="9" rx="1.5"/>
            <rect x="3" y="16" width="7" height="5" rx="1.5"/>
          </svg>
          <svg v-else-if="tab.icon === 'book-open'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <svg v-else-if="tab.icon === 'check-square'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <svg v-else-if="tab.icon === 'user'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </nav>

    <!-- 全局 Toast -->
    <Transition name="toast-slide">
      <div
        v-if="ui.toastVisible"
        :class="[
          'pointer-events-none fixed left-1/2 z-[300] w-[min(92vw,22rem)] -translate-x-1/2 rounded-2xl px-4 py-3 text-center text-sm leading-snug text-white shadow-xl',
          'bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4rem))]',
          ui.toastType === 'error' ? 'bg-rose-600' : ui.toastType === 'success' ? 'bg-emerald-600' : 'bg-slate-800 dark:bg-slate-700',
        ]"
      >
        {{ ui.toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<style>
/* Page slide transition */
.page-slide-enter-active,
.page-slide-leave-active {
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}
.page-slide-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.page-slide-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

/* Toast transition */
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, 16px);
}
</style>
