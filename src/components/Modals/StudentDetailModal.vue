<script setup>
import { computed, ref } from 'vue';
import { findStudentNames, findRecordsByStudent, aggregateStudentStats, getStudentCourses } from '../../composables/useStudentStats';
import { formatLessonFeeBreakdown } from '../../utils/lessonFee';

const props = defineProps({
  visible: { type: Boolean, default: false },
  records: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'open-record']);

const searchQuery = ref('');
const selectedStudent = ref(null);
const mode = ref('search'); // 'search' | 'detail'

const searchResults = computed(() => {
  return findStudentNames(props.records, searchQuery.value);
});

const studentRecords = computed(() => {
  if (!selectedStudent.value) return [];
  return findRecordsByStudent(props.records, selectedStudent.value.name);
});

const studentStats = computed(() => {
  if (!selectedStudent.value) return { count: 0, totalHours: 0, totalFee: 0 };
  return aggregateStudentStats(props.records, selectedStudent.value.name);
});

const studentCourses = computed(() => {
  if (!selectedStudent.value) return [];
  return getStudentCourses(props.records, selectedStudent.value.name);
});

function selectStudent(student) {
  selectedStudent.value = student;
  mode.value = 'detail';
}

function backToSearch() {
  mode.value = 'search';
  selectedStudent.value = null;
}

function onOpenRecord(record) {
  emit('open-record', record);
}

function close() {
  mode.value = 'search';
  searchQuery.value = '';
  selectedStudent.value = null;
  emit('close');
}
</script>

<template>
  <div
    class="fixed inset-0 z-[160] flex items-stretch justify-center bg-slate-900/65 p-0 sm:p-4"
    :class="visible ? '' : 'hidden'"
    @click="close"
  >
    <div
      class="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl"
      role="dialog"
      aria-modal="true"
      @click.stop
    >
      <div class="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <h2 class="text-lg font-semibold text-slate-900">
          <button
            v-if="mode === 'detail'"
            type="button"
            class="mr-2 text-sm font-normal text-indigo-600 underline-offset-2 hover:underline"
            @click="backToSearch"
          >
            ‹ 返回
          </button>
          {{ mode === 'detail' ? '学生详情' : '学生查询' }}
        </h2>
        <button type="button" class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" @click="close">✕</button>
      </div>

      <div class="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <!-- 搜索模式 -->
        <template v-if="mode === 'search'">
          <div class="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="输入学生姓名搜索…"
              class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              v-model="searchQuery"
              @keydown.enter.prevent
            />
          </div>
          <p class="text-xs text-slate-400 mb-2" v-if="searchQuery && searchResults.length">
            找到 {{ searchResults.length }} 个结果
          </p>
          <p class="text-xs text-slate-400 mb-2" v-else-if="searchQuery && !searchResults.length">
            未找到匹配的学生
          </p>
          <ul class="space-y-1">
            <li
              v-for="s in searchResults"
              :key="s.normalized"
              class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 cursor-pointer active:bg-slate-50"
              @click="selectStudent(s)"
            >
              <span class="text-sm font-medium text-slate-900">{{ s.name }}</span>
              <span class="text-xs text-slate-500">{{ s.lessonCount }} 节课</span>
            </li>
          </ul>
          <p v-if="!searchResults.length && !searchQuery" class="text-center text-sm text-slate-400 py-8">
            输入学生姓名开始搜索
          </p>
        </template>

        <!-- 详情模式 -->
        <template v-else-if="mode === 'detail' && selectedStudent">
          <!-- 统计卡片 -->
          <div class="rounded-2xl border border-slate-200 bg-indigo-50 p-4 mb-3">
            <p class="text-base font-semibold text-slate-900">{{ selectedStudent.name }}</p>
            <div class="flex gap-4 mt-2">
              <div>
                <p class="text-lg font-bold text-indigo-700">{{ studentStats.count }}</p>
                <p class="text-xs text-slate-500">上课次数</p>
              </div>
              <div>
                <p class="text-lg font-bold text-indigo-700">{{ studentStats.totalHours }}</p>
                <p class="text-xs text-slate-500">总课时</p>
              </div>
              <div>
                <p class="text-lg font-bold text-emerald-700">¥{{ studentStats.totalFee }}</p>
                <p class="text-xs text-slate-500">总费用</p>
              </div>
            </div>
            <div v-if="studentCourses.length" class="mt-2 flex flex-wrap gap-1">
              <span
                v-for="c in studentCourses"
                :key="c"
                class="rounded-md bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800"
              >
                {{ c }}
              </span>
            </div>
          </div>

          <!-- 记录时间线 -->
          <p class="text-sm font-medium text-slate-700 mb-2">历史记录（按日期降序）</p>
          <ul class="space-y-2">
            <li
              v-for="rec in studentRecords"
              :key="rec.id"
              class="rounded-xl border border-slate-200 bg-white p-3 cursor-pointer active:bg-slate-50"
              @click="onOpenRecord(rec)"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-slate-900 truncate">{{ rec.course || '（未填写课程）' }}</p>
                  <p class="text-xs text-slate-500">{{ rec.lessonDate || '' }} {{ rec.lessonSchedule || '' }}</p>
                  <p v-if="formatLessonFeeBreakdown(rec)" class="text-xs text-emerald-700 mt-0.5">
                    {{ formatLessonFeeBreakdown(rec) }}
                  </p>
                </div>
                <span
                  class="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium"
                  :class="rec.lessonType === 'retail' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'"
                >
                  {{ rec.lessonType === 'retail' ? '零售' : '常规' }}
                </span>
              </div>
            </li>
          </ul>
          <p v-if="!studentRecords.length" class="text-center text-sm text-slate-400 py-4">
            该学生暂无记录
          </p>
        </template>
      </div>
    </div>
  </div>
</template>
