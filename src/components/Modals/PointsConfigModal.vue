<script setup>
import { computed } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  records: { type: Array, default: () => [] },
  categoryMap: { type: Object, default: () => ({}) },
  schoolMap: { type: Object, default: () => ({}) },
});

const emit = defineEmits(['close', 'save']);

const uniqueCourses = computed(() => {
  const set = new Set();
  for (let i = 0; i < props.records.length; i++) {
    const c = props.records[i]?.course;
    if (c && c !== '（未填写课程）') set.add(c);
  }
  return Array.from(set).sort();
});

const uniqueSchedules = computed(() => {
  const set = new Set();
  for (let i = 0; i < props.records.length; i++) {
    const s = props.records[i]?.lessonSchedule;
    if (s) set.add(s);
  }
  return Array.from(set).sort();
});

function getCategory(course) {
  return props.categoryMap[course] === 'trial' ? 'trial' : 'school';
}

function getSchool(schedule) {
  return props.schoolMap[schedule] || '';
}

function toggleCategory(course) {
  const next = { ...props.categoryMap };
  if (next[course] === 'trial') {
    delete next[course];
  } else {
    next[course] = 'trial';
  }
  emit('save', { categories: next });
}

function updateSchoolName(schedule, value) {
  const next = { ...props.schoolMap };
  const v = String(value || '').trim();
  if (v) {
    next[schedule] = v;
  } else {
    delete next[schedule];
  }
  emit('save', { categories: { ...props.categoryMap }, schools: next });
}
</script>

<template>
  <div
    class="fixed inset-0 z-[170] flex flex-col justify-end bg-slate-900/50"
    :class="visible ? '' : 'hidden'"
    @click="emit('close')"
  >
    <div
      class="max-h-[88dvh] overflow-y-auto rounded-t-2xl bg-slate-50 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
      @click.stop
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-slate-900">积分表设置</h2>
        <button
          type="button"
          class="rounded-lg p-1.5 text-slate-500 hover:bg-white"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <p class="text-xs text-slate-500 mb-4">
        设置课程分类和校内课学校名称。默认「常规课」为校内课，可标记为「试听」。
      </p>

      <section class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm space-y-3 mb-3">
        <h3 class="text-base font-semibold text-slate-900">课程分类</h3>
        <p class="text-xs text-slate-500">点击切换「校内课 / 试听」</p>

        <template v-if="uniqueCourses.length">
          <div
            v-for="course in uniqueCourses"
            :key="course"
            class="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <span class="text-sm text-slate-800">{{ course }}</span>
            <button
              type="button"
              class="rounded-lg px-3 py-1 text-xs font-medium transition-colors"
              :class="
                getCategory(course) === 'trial'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-indigo-100 text-indigo-800'
              "
              @click="toggleCategory(course)"
            >
              {{ getCategory(course) === 'trial' ? '试听' : '校内课' }}
            </button>
          </div>
        </template>
        <p v-else class="text-xs text-slate-400">
          暂无课程记录，添加课程记录后再来配置分类。
        </p>
      </section>

      <section
        class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm space-y-3"
      >
        <h3 class="text-base font-semibold text-slate-900">校内课学校名称</h3>
        <p class="text-xs text-slate-500">
          设置在积分表中校内课对应的学校名称（可选）。留空则使用时间段的描述。
        </p>

        <template v-if="uniqueSchedules.length">
          <div
            v-for="schedule in uniqueSchedules"
            :key="schedule"
            class="space-y-1"
          >
            <label class="text-xs text-slate-600">{{ schedule }}</label>
            <input
              type="text"
              :placeholder="schedule"
              class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              :value="getSchool(schedule)"
              @input="updateSchoolName(schedule, $event.target.value)"
            />
          </div>
        </template>
        <p v-else class="text-xs text-slate-400">
          暂无时间段记录。
        </p>
      </section>

      <div class="mt-6">
        <button
          type="button"
          class="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white active:bg-indigo-700"
          @click="emit('close')"
        >
          完成
        </button>
      </div>
    </div>
  </div>
</template>
