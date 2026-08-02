<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

/** Segmented Control 选项 */
const segments = [
  { path: '/teaching/records', label: '课程记录' },
  { path: '/teaching/schedule', label: '排课' },
  { path: '/teaching/attendance', label: '考勤' },
  { path: '/teaching/resources', label: '资源库' },
]

/** 当前激活的 segment path */
const activePath = computed(() => {
  const path = route.path
  // 精确匹配子路由 path
  const matched = segments.find((s) => path.startsWith(s.path))
  return matched ? matched.path : '/teaching/records'
})

function onSegmentClick(seg) {
  if (seg.path !== route.path) {
    router.push(seg.path)
  }
}
</script>

<template>
  <div class="dark:bg-slate-900 min-h-full">
    <!-- 顶部 Segmented Control -->
    <div class="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 pt-3 pb-2">
      <div class="flex gap-1.5 overflow-x-auto scrollbar-hide">
        <button
          v-for="seg in segments"
          :key="seg.path"
          :class="[
            'flex-shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95',
            activePath === seg.path
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-950'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
          ]"
          @click="onSegmentClick(seg)"
        >
          {{ seg.label }}
        </button>
      </div>
    </div>

    <!-- 子路由内容 -->
    <router-view v-slot="{ Component }">
      <Transition name="page-slide" mode="out-in">
        <component :is="Component" />
      </Transition>
    </router-view>
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
</style>
