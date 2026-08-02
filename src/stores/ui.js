import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // ---- 主题 ----
  const theme = ref(localStorage.getItem('ws_theme') || 'system')

  function applyTheme() {
    const root = document.documentElement
    const isDark =
      theme.value === 'dark' ||
      (theme.value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    root.classList.toggle('dark', isDark)
    localStorage.setItem('ws_theme', theme.value)
  }

  // 初始化 + 监听系统主题变化
  applyTheme()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (theme.value === 'system') applyTheme()
  })

  function setTheme(t) {
    theme.value = t
    applyTheme()
  }

  // ---- 模块开关 ----
  const moduleToggles = ref({
    teaching: true,
    todos: true,
    countdown: true,
    pomodoro: true,
  })

  function loadModuleToggles() {
    try {
      const saved = localStorage.getItem('ws_module_toggles')
      if (saved) moduleToggles.value = { ...moduleToggles.value, ...JSON.parse(saved) }
    } catch { /* ignore */ }
  }

  function toggleModule(key) {
    moduleToggles.value[key] = !moduleToggles.value[key]
    localStorage.setItem('ws_module_toggles', JSON.stringify(moduleToggles.value))
  }

  loadModuleToggles()

  // ---- Toast ----
  const toastMessage = ref('')
  const toastType = ref('success')
  const toastVisible = ref(false)
  let toastTimer = null

  function showToast(message, type = 'success', duration = 2500) {
    toastMessage.value = message
    toastType.value = type
    toastVisible.value = true
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toastVisible.value = false
    }, duration)
  }

  return {
    theme,
    setTheme,
    applyTheme,
    moduleToggles,
    toggleModule,
    toastMessage,
    toastType,
    toastVisible,
    showToast,
  }
})
