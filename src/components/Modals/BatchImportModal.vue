<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  rows: { type: Array, default: () => [] },
  applyValues: {
    type: Object,
    default: () => ({
      course: '',
      schedule: '',
      date: '',
    }),
  },
  saving: { type: Boolean, default: false },
});

const emit = defineEmits([
  'close',
  'apply',
  'save-all',
  'update:applyCourse',
  'update:applySchedule',
  'update:applyDate',
  'update:rowField',
]);
</script>

<template>
  <div
    class="fixed inset-0 z-[175] flex items-stretch justify-center bg-slate-900/65 p-0 sm:p-4"
    :class="visible ? '' : 'hidden'"
    @click="emit('close')"
  >
    <div
      class="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl"
      role="dialog"
      aria-modal="true"
      @click.stop
    >
      <div class="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <h2 class="text-lg font-semibold text-slate-900">批量补录</h2>
        <button
          type="button"
          class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>
      <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <section class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h3 class="mb-2 text-sm font-semibold text-slate-800">批量应用设置</h3>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label class="text-xs text-slate-600">
              <span class="mb-1 block">课程</span>
              <input
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                :value="applyValues.course"
                @input="emit('update:applyCourse', $event.target.value)"
              />
            </label>
            <label class="text-xs text-slate-600">
              <span class="mb-1 block">时间段</span>
              <input
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                :value="applyValues.schedule"
                @input="emit('update:applySchedule', $event.target.value)"
              />
            </label>
            <label class="text-xs text-slate-600">
              <span class="mb-1 block">日期</span>
              <input
                type="date"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                :value="applyValues.date"
                @input="emit('update:applyDate', $event.target.value)"
              />
            </label>
          </div>
          <button
            type="button"
            class="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            @click="emit('apply')"
          >
            应用批量设置
          </button>
        </section>

        <p class="text-xs text-slate-400">当前条目数：{{ rows.length }}</p>
        <div v-if="!rows.length" class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
          暂无待补录图片，请先选择图片。
        </div>
        <div v-else class="space-y-2">
          <article
            v-for="it in rows"
            :key="it.id"
            class="rounded-xl border border-slate-200 bg-white p-2.5"
          >
            <div class="flex gap-2">
              <img :src="it.previewUrl" alt="批量补录预览" class="h-16 w-16 rounded-lg object-cover border border-slate-200" />
              <div class="min-w-0 flex-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  class="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="课程"
                  :value="it.course"
                  @input="emit('update:rowField', it.id, 'course', $event.target.value)"
                />
                <input
                  class="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="时间段"
                  :value="it.schedule"
                  @input="emit('update:rowField', it.id, 'schedule', $event.target.value)"
                />
                <input
                  type="date"
                  class="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  :value="it.date"
                  @input="emit('update:rowField', it.id, 'date', $event.target.value)"
                />
              </div>
            </div>
          </article>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            :disabled="saving"
            @click="emit('save-all')"
          >
            {{ saving ? '批量保存中…' : '全部保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
