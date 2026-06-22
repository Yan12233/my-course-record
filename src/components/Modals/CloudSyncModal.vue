<script setup>
import { ref, watch } from 'vue';
import {
  saveSyncConfig,
  loadSyncConfig,
  testWebDAVConnection,
  syncRecords,
  loadSyncStatus,
} from '../../composables/useCloudSync';

const props = defineProps({
  visible: { type: Boolean, default: false },
  records: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'sync-complete']);

const serverUrl = ref('');
const username = ref('');
const password = ref('');
const enabled = ref(false);
const showPassword = ref(false);
const testing = ref(false);
const syncing = ref(false);
const saving = ref(false);
const testResult = ref('');
const lastSyncInfo = ref('');

async function loadSettings() {
  try {
    const config = await loadSyncConfig();
    serverUrl.value = config.serverUrl;
    username.value = config.username;
    password.value = config.password;
    enabled.value = config.enabled;

    const status = await loadSyncStatus();
    if (status.lastSyncAt) {
      const d = new Date(status.lastSyncAt);
      const ok = status.lastSyncOk ? '✓' : '✕';
      lastSyncInfo.value = `${ok} ${d.toLocaleString()} — ${status.lastSyncMessage}`;
    } else {
      lastSyncInfo.value = '尚未同步';
    }
  } catch (err) {
    lastSyncInfo.value = '读取状态失败';
  }
  testResult.value = '';
}

watch(
  () => props.visible,
  (v) => {
    if (v) loadSettings();
  },
);

async function onTest() {
  if (!serverUrl.value || !username.value || !password.value) {
    testResult.value = '请先填写完整配置';
    return;
  }
  testing.value = true;
  testResult.value = '正在测试…';
  try {
    const res = await testWebDAVConnection(serverUrl.value, username.value, password.value);
    testResult.value = res.ok ? '✓ ' + res.message : '✕ ' + res.message;
  } catch (err) {
    testResult.value = '✕ 测试异常';
  }
  testing.value = false;
}

async function onSave() {
  saving.value = true;
  try {
    await saveSyncConfig({
      serverUrl: serverUrl.value,
      username: username.value,
      password: password.value,
      enabled: enabled.value,
    });
    testResult.value = enabled.value
      ? '配置已保存，下次保存记录时将自动同步'
      : '配置已保存';
  } catch (err) {
    testResult.value = '✕ 保存失败';
  }
  saving.value = false;
}

async function onSyncNow() {
  syncing.value = true;
  testResult.value = '正在同步…';
  try {
    const res = await syncRecords(serverUrl.value, username.value, password.value, props.records);
    testResult.value = res.ok ? '✓ ' + res.message : '✕ ' + res.message;
    if (res.ok && res.records) {
      emit('sync-complete', res.records);
    }
    const status = await loadSyncStatus();
    if (status.lastSyncAt) {
      const d = new Date(status.lastSyncAt);
      const ok = status.lastSyncOk ? '✓' : '✕';
      lastSyncInfo.value = `${ok} ${d.toLocaleString()} — ${status.lastSyncMessage}`;
    }
  } catch (err) {
    testResult.value = '✕ 同步异常';
  }
  syncing.value = false;
}
</script>

<template>
  <div
    class="fixed inset-0 z-[180] flex items-center justify-center bg-slate-900/65 p-4"
    :class="visible ? '' : 'hidden'"
    @click="emit('close')"
  >
    <div
      class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4"
      role="dialog"
      aria-modal="true"
      @click.stop
    >
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-900">☁️ 云同步设置</h2>
        <button
          type="button"
          class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <p class="text-xs text-slate-500 leading-relaxed">
        通过 WebDAV（推荐 坚果云）实现多设备数据同步。
        CORS 代理已由 Netlify Function 自动处理，部署后即可使用。
      </p>

      <!-- 服务器地址 -->
      <div>
        <label class="block text-xs font-medium text-slate-600 mb-1">服务器地址</label>
        <input
          v-model="serverUrl"
          type="url"
          placeholder="https://dav.jianguoyun.com/dav/"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <!-- 账号 -->
      <div>
        <label class="block text-xs font-medium text-slate-600 mb-1">用户名（坚果云账号邮箱）</label>
        <input
          v-model="username"
          type="text"
          placeholder="your@email.com"
          autocomplete="username"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <!-- 密码 -->
      <div>
        <label class="block text-xs font-medium text-slate-600 mb-1">
          应用密码
          <a
            href="https://help.jianguoyun.com/?p=2064"
            target="_blank"
            class="text-indigo-600 underline"
            @click.stop
          >
            （如何获取？）
          </a>
        </label>
        <div class="flex gap-2">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="应用密码（非登录密码）"
            autocomplete="current-password"
            class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-500 active:bg-slate-100"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? '隐藏' : '显示' }}
          </button>
        </div>
      </div>

      <!-- 启用自动同步 -->
      <label class="flex items-center gap-3 cursor-pointer">
        <div
          class="relative h-5 w-9 rounded-full transition-colors"
          :class="enabled ? 'bg-indigo-600' : 'bg-slate-300'"
        >
          <div
            class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
            :class="enabled ? 'translate-x-4' : 'translate-x-0'"
          />
          <input type="checkbox" v-model="enabled" class="sr-only" />
        </div>
        <span class="text-sm text-slate-700">保存记录后自动同步</span>
      </label>

      <!-- 操作按钮 -->
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="flex-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 active:bg-indigo-100 disabled:opacity-40"
          :disabled="testing || !serverUrl || !username || !password"
          @click="onTest"
        >
          {{ testing ? '测试中…' : '🔗 测试连接' }}
        </button>
        <button
          type="button"
          class="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm active:bg-indigo-700 disabled:opacity-40"
          :disabled="saving"
          @click="onSave"
        >
          {{ saving ? '保存中…' : '💾 保存配置' }}
        </button>
      </div>

      <button
        type="button"
        class="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700 active:bg-emerald-100 disabled:opacity-40"
        :disabled="syncing || !serverUrl || !username || !password"
        @click="onSyncNow"
      >
        {{ syncing ? '同步中…' : '🔄 立即同步' }}
      </button>

      <!-- 结果 & 状态 -->
      <div v-if="testResult" class="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {{ testResult }}
      </div>
      <div class="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        上次同步：{{ lastSyncInfo }}
      </div>
    </div>
  </div>
</template>
