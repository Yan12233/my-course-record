<script setup>
import { ref, onMounted } from 'vue';

const STORAGE_KEY = 'pwa_install_prompt_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

const deferredPrompt = ref(null);
const isVisible = ref(false);
const isDismissing = ref(false);

/**
 * 判断当前是否已处于独立模式（已安装到桌面）
 * 兼容 Chrome 的 matchMedia 和 iOS Safari 的 navigator.standalone
 */
function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  // Chrome / Android / 新版 Safari
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari（添加到主屏幕后 navigator.standalone 为 true）
  if (typeof navigator !== 'undefined' && navigator.standalone) return true;
  return false;
}

/**
 * 检查用户是否在 7 天内主动关闭过提示
 */
function wasRecentlyDismissed() {
  try {
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (!dismissedAt) return false;
    const elapsed = Date.now() - parseInt(dismissedAt, 10);
    return elapsed < DISMISS_DURATION_MS;
  } catch {
    // localStorage 不可用时默认不屏蔽
    return false;
  }
}

/**
 * 判断是否应该显示安装提示
 */
function shouldShowPrompt() {
  // 已安装到桌面则不显示
  if (isStandaloneMode()) return false;
  // 7 天内关闭过则不显示
  if (wasRecentlyDismissed()) return false;
  return true;
}

/**
 * 处理 beforeinstallprompt 事件
 */
function onBeforeInstallPrompt(event) {
  // 阻止浏览器默认的安装提示
  event.preventDefault();
  // 保存事件引用以供后续 prompt() 调用
  deferredPrompt.value = event;
  // 检查是否应该显示自定义提示
  if (shouldShowPrompt()) {
    isVisible.value = true;
  }
}

/**
 * 用户点击"添加到主屏幕"
 */
async function handleInstall() {
  if (!deferredPrompt.value) {
    // 已经没有 deferredPrompt 了，可能已经安装或浏览器不支持
    isVisible.value = false;
    return;
  }

  try {
    // 触发浏览器原生安装提示
    await deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;
    // 无论用户是否安装，关闭自定义提示
    deferredPrompt.value = null;
    isVisible.value = false;

    if (outcome === 'accepted') {
      console.log('[PWA] 用户接受了安装');
    }
  } catch (error) {
    console.warn('[PWA] 安装提示失败:', error);
    deferredPrompt.value = null;
    isVisible.value = false;
  }
}

/**
 * 用户点击"暂不需要"
 */
function handleDismiss() {
  isDismissing.value = true;
  // 动画结束后隐藏
  setTimeout(() => {
    isVisible.value = false;
    isDismissing.value = false;
  }, 250);

  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // localStorage 不可用时静默失败
  }
}

onMounted(() => {
  // 监听 beforeinstallprompt 事件
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

  // 如果已经安装了（appinstalled 事件），关闭提示
  window.addEventListener('appinstalled', () => {
    isVisible.value = false;
    deferredPrompt.value = null;
    console.log('[PWA] App 已安装');
  });
});
</script>

<template>
  <Transition name="install-prompt">
    <div
      v-if="isVisible"
      :class="[
        'fixed bottom-0 left-0 right-0 z-[200] px-4',
        'pb-[max(4.25rem,calc(env(safe-area-inset-bottom)+4rem))]',
        isDismissing ? 'pointer-events-none' : '',
      ]"
    >
      <div
        class="mx-auto max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-indigo-100 dark:border-indigo-900/50 p-4"
        style="box-shadow: 0 -8px 32px rgba(79, 70, 229, 0.15)"
      >
        <!-- 顶部横条装饰 -->
        <div class="flex justify-center -mt-5 mb-3">
          <div class="w-10 h-1 rounded-full bg-indigo-200 dark:bg-indigo-700" />
        </div>

        <div class="flex items-start gap-3">
          <!-- 图标 -->
          <div
            class="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center shadow-md"
          >
            <svg
              class="w-7 h-7 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>

          <!-- 文字内容 -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
              添加到主屏幕
            </p>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              将教师工作台添加到主屏幕，像 App 一样使用，体验更流畅
            </p>
          </div>
        </div>

        <!-- 按钮区 -->
        <div class="flex gap-2.5 mt-4">
          <button
            class="flex-1 rounded-xl border border-indigo-200 dark:border-indigo-700 py-2.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 active:scale-[0.97] transition-all duration-150"
            @click="handleDismiss"
          >
            暂不需要
          </button>
          <button
            class="flex-[1.5] rounded-xl bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 active:scale-[0.97] transition-all duration-150"
            @click="handleInstall"
          >
            添加到主屏幕
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.install-prompt-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.install-prompt-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 1, 1);
}
.install-prompt-enter-from {
  opacity: 0;
  transform: translateY(100%);
}
.install-prompt-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
