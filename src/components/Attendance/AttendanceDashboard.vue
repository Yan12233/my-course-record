<script setup>
const props = defineProps({
  todayStats: { type: Object, default: () => ({ attendanceRate: 0, totalConsumedHours: 0, warningCount: 0 }) },
});
</script>

<template>
  <div class="grid grid-cols-3 gap-2">
    <!-- 出勤率 -->
    <div class="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
      <div class="text-xl font-bold text-emerald-600 dark:text-emerald-400">
        {{ todayStats.attendanceRate }}%
      </div>
      <div class="text-[10px] text-emerald-400 dark:text-emerald-500 mt-0.5">出勤率</div>
    </div>

    <!-- 消耗课时 -->
    <div class="rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 p-3 text-center">
      <div class="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        {{ todayStats.totalConsumedHours }}h
      </div>
      <div class="text-[10px] text-indigo-400 dark:text-indigo-500 mt-0.5">消耗课时</div>
    </div>

    <!-- 预警人数 -->
    <div class="rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-3 text-center">
      <div class="text-xl font-bold text-amber-600 dark:text-amber-400">
        {{ todayStats.warningCount }}
      </div>
      <div class="text-[10px] text-amber-400 dark:text-amber-500 mt-0.5">预警人数</div>
    </div>
  </div>
</template>
