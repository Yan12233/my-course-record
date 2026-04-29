<script setup>
defineProps({
  students: {
    type: Array,
    default: () => [],
  },
  newStudentName: {
    type: String,
    default: '',
  },
});

const emit = defineEmits([
  'update:newStudentName',
  'add-student',
  'remove-student',
  'step-student',
  'update-student-field',
  'save-common',
  'load-common',
]);
</script>

<template>
  <div class="space-y-2">
    <p class="text-sm font-medium text-slate-700">学生列表管理</p>
    <div class="flex gap-2">
      <input
        id="studentNameInput"
        type="text"
        maxlength="30"
        placeholder="输入学生姓名后添加"
        autocomplete="off"
        class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none ring-0 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        :value="newStudentName"
        @input="emit('update:newStudentName', $event.target.value)"
        @keydown.enter.prevent="emit('add-student')"
      />
      <button
        type="button"
        class="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white active:bg-indigo-700"
        @click="emit('add-student')"
      >
        添加学生
      </button>
    </div>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 active:bg-emerald-100"
        @click="emit('save-common')"
      >
        保存常用名单
      </button>
      <button
        type="button"
        class="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 active:bg-amber-100"
        @click="emit('load-common')"
      >
        载入上次填写学生姓名
      </button>
    </div>

    <div class="space-y-2">
      <article
        v-for="(s, idx) in students"
        :key="`${s.name}-${idx}`"
        class="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-semibold text-slate-900">{{ s.name || '未命名学生' }}</p>
          <button
            type="button"
            class="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-700 active:bg-rose-50"
            @click="emit('remove-student', idx)"
          >
            移除
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <label class="text-slate-600">
            上节课作业完成
            <div class="mt-1 flex items-center gap-1">
              <button type="button" class="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs active:bg-slate-100" @click="emit('step-student', idx, 'hwDone', -1)">-</button>
              <input type="number" min="0" class="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-sm" :value="s.hwDone" @input="emit('update-student-field', idx, 'hwDone', $event.target.value)" />
              <button type="button" class="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs active:bg-slate-100" @click="emit('step-student', idx, 'hwDone', 1)">+</button>
            </div>
          </label>

          <label class="text-slate-600">
            上节课作业总数
            <div class="mt-1 flex items-center gap-1">
              <button type="button" class="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs active:bg-slate-100" @click="emit('step-student', idx, 'hwTotal', -1)">-</button>
              <input type="number" min="1" class="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-sm" :value="s.hwTotal" @input="emit('update-student-field', idx, 'hwTotal', $event.target.value)" />
              <button type="button" class="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs active:bg-slate-100" @click="emit('step-student', idx, 'hwTotal', 1)">+</button>
            </div>
          </label>

          <label class="text-slate-600">
            本节课练习完成
            <div class="mt-1 flex items-center gap-1">
              <button type="button" class="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs active:bg-slate-100" @click="emit('step-student', idx, 'cwDone', -1)">-</button>
              <input type="number" min="0" class="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-sm" :value="s.cwDone" @input="emit('update-student-field', idx, 'cwDone', $event.target.value)" />
              <button type="button" class="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs active:bg-slate-100" @click="emit('step-student', idx, 'cwDone', 1)">+</button>
            </div>
          </label>

          <label class="text-slate-600">
            本节课练习总数
            <div class="mt-1 flex items-center gap-1">
              <button type="button" class="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs active:bg-slate-100" @click="emit('step-student', idx, 'cwTotal', -1)">-</button>
              <input type="number" min="1" class="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-sm" :value="s.cwTotal" @input="emit('update-student-field', idx, 'cwTotal', $event.target.value)" />
              <button type="button" class="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs active:bg-slate-100" @click="emit('step-student', idx, 'cwTotal', 1)">+</button>
            </div>
          </label>
        </div>

        <label class="block text-xs text-slate-600">
          课堂学习情况
          <textarea
            rows="3"
            class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            :value="s.feedback || ''"
            @input="emit('update-student-field', idx, 'feedback', $event.target.value)"
          />
        </label>
      </article>
      <p v-if="!students.length" class="text-xs text-slate-400">暂无学生，请先添加。</p>
    </div>
  </div>
</template>
