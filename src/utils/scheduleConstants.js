/**
 * 排课模块常量定义
 *
 * 包含：固定时段列表、课程颜色映射、年级选项、资源类型枚举、考勤预警阈值
 */

/** 默认排课时段列表（P0 固定，P1 可自定义） */
export const DEFAULT_SCHEDULE_SLOTS = [
  { id: 'slot-1', label: '上午 08:00-10:00', start: '08:00', end: '10:00' },
  { id: 'slot-2', label: '上午 10:00-12:00', start: '10:00', end: '12:00' },
  { id: 'slot-3', label: '下午 14:00-16:00', start: '14:00', end: '16:00' },
  { id: 'slot-4', label: '下午 16:00-18:00', start: '16:00', end: '18:00' },
  { id: 'slot-5', label: '晚上 19:00-21:00', start: '19:00', end: '21:00' },
]

/** 课程颜色映射（8 色循环），同时适配亮色和暗色模式 */
export const COURSE_COLORS = [
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
  'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300',
  'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-300',
  'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300',
  'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300',
]

/** 课程卡片背景色（更饱和的色块，用于排课网格卡片） */
export const COURSE_CARD_COLORS = [
  'bg-indigo-500 text-white',
  'bg-emerald-500 text-white',
  'bg-amber-500 text-white',
  'bg-rose-500 text-white',
  'bg-sky-500 text-white',
  'bg-violet-500 text-white',
  'bg-teal-500 text-white',
  'bg-orange-500 text-white',
]

/** 年级选项 */
export const GRADE_OPTIONS = [
  '幼儿园',
  '一年级',
  '二年级',
  '三年级',
  '四年级',
  '五年级',
  '六年级',
  '初一',
  '初二',
  '初三',
  '高一',
  '高二',
  '高三',
]

/** 资源类型枚举 */
export const RESOURCE_TYPES = [
  { value: 'lesson_plan', label: '教案' },
  { value: 'courseware', label: '课件' },
  { value: 'exercise', label: '习题' },
  { value: 'other', label: '其他' },
]

/** 考勤课时预警阈值（剩余课时 ≤ 此值时预警） */
export const ATTENDANCE_THRESHOLD_DEFAULT = 4

/**
 * 根据课程名获取颜色索引
 * @param {string} course - 课程名
 * @param {string[]} courseList - 课程分类列表
 * @returns {number} 颜色索引（0-7）
 */
export function getCourseColorIndex(course, courseList) {
  if (!course) return 0
  if (courseList && courseList.length) {
    const idx = courseList.indexOf(course)
    if (idx >= 0) return idx % COURSE_COLORS.length
  }
  // 如果不在课程列表中，用课程名 hash 取模
  let hash = 0
  for (let i = 0; i < course.length; i++) {
    hash = ((hash << 5) - hash + course.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % COURSE_COLORS.length
}
