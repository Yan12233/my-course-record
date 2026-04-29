<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  weekdays: { type: Array, default: () => [] },
  formValues: {
    type: Object,
    default: () => ({
      weekday: '周一',
      slot: '',
      course: '',
    }),
  },
  editing: { type: Boolean, default: false },
});

const emit = defineEmits([
  'close',
  'submit',
  'cancel-edit',
  'delete',
  'begin-edit',
  'update:weekday',
  'update:slot',
  'update:course',
]);
</script>

<template>
  <div
    class="fixed inset-0 z-[170] flex items-stretch justify-center bg-slate-900/65 p-0 sm:p-4"
    :class="visible ? '' : 'hidden'"
    @click="emit('close')"
  >
    <div
      class="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl"
      role="dialog"
      aria-modal="true"
      @click.stop
    >
      <div class="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <h2 class="text-lg font-semibold text-slate-900">我的课表</h2>
        <button
          type="button"
          class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>
      <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <form class="rounded-xl border border-slate-200 bg-slate-50 p-3" @submit.prevent="emit('submit')">
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label class="text-xs text-slate-600">
              <span class="mb-1 block font-medium text-slate-700">星期</span>
              <select
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                :value="formValues.weekday"
                @change="emit('update:weekday', $event.target.value)"
              >
                <option v-for="day in weekdays" :key="day" :value="day">{{ day }}</option>
              </select>
            </label>
            <label class="text-xs text-slate-600">
              <span class="mb-1 block font-medium text-slate-700">上课时间段</span>
              <input
                type="text"
                maxlength="80"
                placeholder="如 08:00-09:30 / 第1-2节"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                :value="formValues.slot"
                @input="emit('update:slot', $event.target.value)"
              />
            </label>
            <label class="text-xs text-slate-600">
              <span class="mb-1 block font-medium text-slate-700">课程名称</span>
              <input
                type="text"
                maxlength="80"
                placeholder="如 高数 / Python"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                :value="formValues.course"
                @input="emit('update:course', $event.target.value)"
              />
            </label>
          </div>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              type="submit"
              class="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white active:bg-indigo-700"
            >
              {{ editing ? '保存修改' : '新增课表项' }}
            </button>
            <button
              v-if="editing"
              type="button"
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 active:bg-slate-50"
              @click="emit('cancel-edit')"
            >
              取消编辑
            </button>
          </div>
        </form>
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          <section
            v-for="day in weekdays"
            :key="day"
            class="rounded-xl border border-slate-200 bg-white p-2.5"
          >
            <h3 class="mb-2 text-sm font-semibold text-slate-800">{{ day }}</h3>
            <template v-if="items.some((it) => it.weekday === day)">
              <div
                v-for="it in items.filter((x) => x.weekday === day).slice().sort((a,b)=>String(a.slot).localeCompare(String(b.slot)))"
                :key="it.id"
                class="mb-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 last:mb-0"
              >
                <p class="text-xs font-medium text-slate-800">{{ it.slot }} · {{ it.course }}</p>
                <div class="mt-1 flex gap-1">
                  <button
                    type="button"
                    class="rounded border border-indigo-200 bg-white px-2 py-0.5 text-[11px] text-indigo-700"
                    @click="emit('begin-edit', it)"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    class="rounded border border-rose-200 bg-white px-2 py-0.5 text-[11px] text-rose-700"
                    @click="emit('delete', it.id)"
                  >
                    删除
                  </button>
                </div>
              </div>
            </template>
            <p v-else class="text-xs text-slate-400">暂无安排</p>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
