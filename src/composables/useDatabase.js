import localforage from 'localforage';
import { useImageHandler } from './useImageHandler';
import { deriveLessonDateFromDatetimeStr } from '../utils/lessonDate';
import { computeLessonFee, normalizeHeadCount } from '../utils/lessonFee';

const STORAGE_KEY_RECORDS = 'course_records_v1';
const STORAGE_KEY_TIME_SLOT_SUGGESTIONS = 'time_slot_suggestions_v1';
const STORAGE_KEY_TIMETABLE = 'my_timetable';
const STORAGE_KEY_COMMON_STUDENT_NAMES = 'common_student_names_v1';
const STORAGE_KEY_FEEDBACK_DRAFT = 'feedback_form_draft_v1';
const STORAGE_KEY_POINTS_COURSE_CATEGORIES = 'points_course_categories_v1';
const STORAGE_KEY_POINTS_TEACHER_NAME = 'points_teacher_name_v1';
const STORAGE_KEY_POINTS_SCHOOL_NAMES = 'points_school_names_v1';
const STORAGE_KEY_LESSON_TEMPLATES = 'lesson_templates_v1';
const STORAGE_KEY_COURSE_LIST = 'course_list_v1';
const STORAGE_KEY_DEFAULT_TEACHER_NAME = 'default_teacher_name_v1';
const STORAGE_KEY_SCHEDULE = 'schedule_v1';
const STORAGE_KEY_ATTENDANCE = 'attendance_v1';
const STORAGE_KEY_HOUR_ACCOUNTS = 'student_hour_accounts_v1';
const STORAGE_KEY_RESOURCE_INDEX = 'resource_index_v1';
const STORAGE_KEY_CLASSROOM_SUGGESTIONS = 'classroom_suggestions_v1';
export const TIMETABLE_WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

let configured = false;

/**
 * 尝试从字符串中解析出两个 HH:mm 时间。
 * 支持 "14:00-16:00"、"14:00—16:00"、"9:00-11:00" 等。
 */
function parseTimeString(text) {
  const t = String(text == null ? '' : text).trim();
  const m = /(\d{1,2}):(\d{2})\s*[-\u2014~\uff5e\u81f3\u5230\u5230]\s*(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  const sh = parseInt(m[1], 10);
  const sm = parseInt(m[2], 10);
  const eh = parseInt(m[3], 10);
  const em = parseInt(m[4], 10);
  if (sh > 23 || eh > 23 || sm > 59 || em > 59) return null;
  return [
    `${String(sh).padStart(2, '0')}:${m[2]}`,
    `${String(eh).padStart(2, '0')}:${m[4]}`,
  ];
}

/**
 * 把任意 slot 值（对象 / 字符串）解析为标准结构。
 * 能解析 "HH:mm-HH:mm" 格式则返回 structured: true；
 * 不能解析（如 "下午2点-4点"）则保留原文本，structured: false。
 */
export function normalizeSlot(slot) {
  if (slot && typeof slot === 'object' && !Array.isArray(slot)) {
    const start = String(slot.start || '').trim();
    const end = String(slot.end || '').trim();
    const raw = String(slot.raw || '').trim();
    if (/^\d{1,2}:\d{2}$/.test(start) && /^\d{1,2}:\d{2}$/.test(end)) {
      return { start, end, raw: raw || `${start}-${end}`, structured: true };
    }
    if (raw) {
      const parsed = parseTimeString(raw);
      if (parsed) return { start: parsed[0], end: parsed[1], raw, structured: true };
      return { start: '', end: '', raw, structured: false };
    }
    if (start || end) {
      const ps = parseTimeString(`${start}-${end}`);
      if (ps) return { start: ps[0], end: ps[1], raw: `${start}-${end}`, structured: true };
    }
    return { start: '', end: '', raw: '', structured: false };
  }
  const text = String(slot == null ? '' : slot).trim();
  if (!text) return { start: '', end: '', raw: '', structured: false };
  const parsed = parseTimeString(text);
  if (parsed) return { start: parsed[0], end: parsed[1], raw: text, structured: true };
  return { start: '', end: '', raw: text, structured: false };
}

/**
 * 显示用格式化。structured 返回 "14:00-16:00"；非 structured 返回 raw 原文本。
 */
export function formatSlot(slot) {
  const n = normalizeSlot(slot);
  if (n.structured) return `${n.start}-${n.end}`;
  return n.raw || '';
}

/**
 * slotStartMinutes - 提取 slot 的开始时间（分钟数），用于排序
 * @param {*} slot
 * @returns {number} - 开始时间的分钟数，无法解析返回 Infinity（排最后）
 */
export function slotStartMinutes(slot) {
  const n = normalizeSlot(slot);
  if (!n.structured || !n.start) return Infinity;
  const parts = n.start.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * 将 "HH:mm" 转为中文时段描述，如 "14:00" → "下午2点"
 */
export function formatChineseTime(hhmm) {
  const m = /^(\d{1,2}):\d{2}$/.exec(String(hhmm || '').trim());
  if (!m) return '';
  const h = parseInt(m[1], 10);
  let period;
  if (h >= 0 && h <= 5) period = '凌晨';
  else if (h >= 6 && h <= 11) period = '上午';
  else if (h === 12) period = '中午';
  else if (h >= 13 && h <= 17) period = '下午';
  else period = '晚上';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period}${display}点`;
}

/**
 * 将 slot 转为中文时间段描述，如 {start:"14:00",end:"16:00"} → "下午2点到4点"
 * 同一时段（如上下午）省略第二个时段前缀。
 */
export function formatChineseSlot(slot) {
  const n = normalizeSlot(slot);
  if (!n.structured) return n.raw || '';

  const startMin = parseInt(String(n.start || '').split(':')[0], 10);
  const endMin = parseInt(String(n.end || '').split(':')[0], 10);
  if (Number.isNaN(startMin) || Number.isNaN(endMin)) return n.raw || '';

  function periodOf(h) {
    if (h >= 0 && h <= 5) return '凌晨';
    if (h >= 6 && h <= 11) return '上午';
    if (h === 12) return '中午';
    if (h >= 13 && h <= 17) return '下午';
    return '晚上';
  }

  const displayHour = (h) => (h === 0 ? 12 : h > 12 ? h - 12 : h);

  const sp = periodOf(startMin);
  const ep = periodOf(endMin);

  if (sp === ep) {
    return `${sp}${displayHour(startMin)}点到${displayHour(endMin)}点`;
  }
  return `${sp}${displayHour(startMin)}点到${ep}${displayHour(endMin)}点`;
}

/**
 * 生成唯一记录 ID
 * 优先使用 crypto.randomUUID()，回退到时间戳+随机数
 * @returns {string}
 */
export function generateRecordId() {
  if (window.crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function useDatabase() {
  const { readFileAsDataURL } = useImageHandler();

  function ensureConfigured() {
    if (configured) return;
    localforage.config({
      name: 'MyCourseRecordH5',
      storeName: 'lesson_records',
      description: '上课记录（时间与课程及图片）',
    });
    configured = true;
  }

  function normalizeNonNegativeNumber(v) {
    const n = parseFloat(v);
    if (Number.isNaN(n) || n < 0) return 0;
    return Math.round(n * 100) / 100;
  }

  function normalizeLessonType(raw) {
    return raw === 'retail' ? 'retail' : 'regular';
  }

  function sanitizeRecord(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = raw.id ? String(raw.id) : generateRecordId();
    const datetime = typeof raw.datetime === 'string' ? raw.datetime : '';
    const course = String(raw.course || '').trim() || '（未填写课程）';
    const lessonSchedule = String(raw.lessonSchedule || '').trim();
    let lessonDate = String(raw.lessonDate || '').trim();
    if (!lessonDate && datetime) {
      lessonDate = deriveLessonDateFromDatetimeStr(datetime);
    }
    const students = [];
    if (Array.isArray(raw.students)) {
      for (let i = 0; i < raw.students.length; i++) {
        const one = sanitizeStudent(raw.students[i]);
        if (one) students.push(one);
      }
    }
    const lessonType = normalizeLessonType(raw.lessonType);
    let feeRate = normalizeNonNegativeNumber(raw.feeRate);
    const classHours = normalizeNonNegativeNumber(raw.classHours);
    let classFee = normalizeNonNegativeNumber(raw.classFee);
    let headCount = normalizeHeadCount(raw.headCount);
    if (lessonType === 'retail' && headCount === 0 && students.length > 0) {
      headCount = students.length;
    }

    if (!feeRate && classFee > 0 && classHours > 0) {
      if (lessonType === 'retail' && headCount > 0) {
        feeRate = normalizeNonNegativeNumber(classFee / classHours / headCount);
      } else {
        feeRate = normalizeNonNegativeNumber(classFee / classHours);
      }
    }

    classFee = computeLessonFee({
      lessonType,
      classHours,
      feeRate,
      headCount,
    });

    return {
      id,
      datetime,
      course,
      lessonSchedule,
      lessonDate,
      subject: String(raw.subject || raw.course || '').trim() || course,
      classSchedule: String(raw.classSchedule || raw.lessonSchedule || '').trim(),
      teacher: String(raw.teacher || '').trim(),
      classTime: String(raw.classTime || '').trim(),
      classTimeSlot: raw.classTimeSlot && typeof raw.classTimeSlot === 'object'
        ? { start: String(raw.classTimeSlot.start || '').trim(), end: String(raw.classTimeSlot.end || '').trim() }
        : null,
      admin: String(raw.admin || '林玲').trim() || '林玲',
      courseContent: String(raw.courseContent || '').trim(),
      students,
      lessonType,
      classHours,
      headCount: lessonType === 'retail' ? headCount : 0,
      feeRate,
      classFee,
      advancedFeedbackEnabled: !!raw.advancedFeedbackEnabled,
      imageBase64: typeof raw.imageBase64 === 'string' ? raw.imageBase64 : null,
      imageFileName: raw.imageFileName || null,
      imageMimeType: raw.imageMimeType || null,
      createdAt: typeof raw.createdAt === 'number' && !Number.isNaN(raw.createdAt) ? raw.createdAt : Date.now(),
    };
  }

  function normalizeNonNegativeInt(v) {
    const n = parseInt(v, 10);
    if (Number.isNaN(n) || n < 0) return 0;
    return n;
  }

  function normalizeStudentName(name) {
    return String(name == null ? '' : name).trim().slice(0, 30);
  }

  function sanitizeStudent(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const name = normalizeStudentName(raw.name);
    if (!name) return null;
    let hwDone = raw.hwDone;
    if (hwDone === undefined) hwDone = raw.homeworkDone;
    let hwTotal = raw.hwTotal;
    if (hwTotal === undefined) hwTotal = raw.homeworkTotal;
    let cwDone = raw.cwDone;
    if (cwDone === undefined) cwDone = raw.practiceDone;
    let cwTotal = raw.cwTotal;
    if (cwTotal === undefined) cwTotal = raw.practiceTotal;
    let feedback = raw.feedback;
    if (feedback === undefined) feedback = raw.learningComment;
    return {
      name,
      hwDone: normalizeNonNegativeInt(hwDone),
      hwTotal: Math.max(1, normalizeNonNegativeInt(hwTotal)),
      cwDone: normalizeNonNegativeInt(cwDone),
      cwTotal: Math.max(1, normalizeNonNegativeInt(cwTotal)),
      feedback: String(feedback || '').trim(),
    };
  }

  function persistLessonRecord(datetime, course, file, lessonSchedule, lessonDateRaw, feedbackData) {
    ensureConfigured();
    const trimmed = lessonDateRaw !== undefined && lessonDateRaw !== null ? String(lessonDateRaw).trim() : '';
    let lessonDateStored = trimmed;
    if (!lessonDateStored) {
      lessonDateStored = deriveLessonDateFromDatetimeStr(datetime);
    }

    const fd = feedbackData && typeof feedbackData === 'object' ? feedbackData : {};
    const sanitizedStudents = [];
    if (Array.isArray(fd.students)) {
      for (let i = 0; i < fd.students.length; i++) {
        const one = sanitizeStudent(fd.students[i]);
        if (one) sanitizedStudents.push(one);
      }
    }

    const lessonType = normalizeLessonType(fd.lessonType);
    const classHours = normalizeNonNegativeNumber(fd.classHours);
    const feeRate = normalizeNonNegativeNumber(fd.feeRate);
    let headCount = normalizeHeadCount(fd.headCount);
    if (lessonType === 'retail' && headCount === 0) {
      headCount = sanitizedStudents.length > 0 ? sanitizedStudents.length : 1;
    }
    const classFee = computeLessonFee({
      lessonType,
      classHours,
      feeRate,
      headCount,
    });

    const record = {
      id: generateRecordId(),
      datetime,
      course,
      lessonSchedule:
        lessonSchedule && typeof lessonSchedule === 'string' && lessonSchedule.trim().length > 0
          ? lessonSchedule.trim()
          : '',
      lessonDate: lessonDateStored || '',
      subject: typeof fd.subject === 'string' ? fd.subject.trim() : (course || ''),
      classSchedule:
        typeof fd.classSchedule === 'string' ? fd.classSchedule.trim() : (lessonSchedule || ''),
      teacher: typeof fd.teacher === 'string' ? fd.teacher.trim() : '',
      classTime: typeof fd.classTime === 'string' ? fd.classTime.trim() : '',
      classTimeSlot: fd.classTimeSlot && typeof fd.classTimeSlot === 'object' && fd.classTimeSlot.start
        ? { start: String(fd.classTimeSlot.start).trim(), end: String(fd.classTimeSlot.end || '').trim() }
        : null,
      admin: typeof fd.admin === 'string' ? fd.admin.trim() : '林玲',
      courseContent: typeof fd.courseContent === 'string' ? fd.courseContent.trim() : '',
      students: sanitizedStudents,
      lessonType,
      classHours,
      headCount: lessonType === 'retail' ? headCount : 0,
      feeRate,
      classFee,
      advancedFeedbackEnabled: !!fd.advancedFeedbackEnabled,
      imageBase64: null,
      imageFileName: null,
      imageMimeType: null,
      createdAt: Date.now(),
    };

    function appendToStore(finalRecord) {
      return localforage.getItem(STORAGE_KEY_RECORDS).then((arr) => {
        const list = Array.isArray(arr) ? arr : [];
        list.unshift(finalRecord);
        return localforage.setItem(STORAGE_KEY_RECORDS, list).then(() => finalRecord);
      });
    }

    if (!file) return appendToStore(record);

    record.imageFileName = file.name || null;
    record.imageMimeType = file.type || 'image/jpeg';

    return readFileAsDataURL(file).then((dataUrl) => {
      if (typeof dataUrl === 'string') {
        record.imageBase64 = dataUrl;
      }
      return appendToStore(record);
    });
  }

  function getAllRecords() {
    ensureConfigured();
    return localforage.getItem(STORAGE_KEY_RECORDS).then((arr) => {
      const raw = Array.isArray(arr) ? arr : [];
      const out = [];
      for (let i = 0; i < raw.length; i++) {
        const one = sanitizeRecord(raw[i]);
        if (one) out.push(one);
      }
      return out;
    });
  }

  function setAllRecords(list) {
    ensureConfigured();
    const safe = [];
    const arr = Array.isArray(list) ? list : [];
    for (let i = 0; i < arr.length; i++) {
      const one = sanitizeRecord(arr[i]);
      if (one) safe.push(one);
    }
    return localforage.setItem(STORAGE_KEY_RECORDS, safe);
  }

  function deleteRecordById(id) {
    return getAllRecords().then((list) => {
      const next = list.filter((r) => r && r.id !== id);
      return setAllRecords(next);
    });
  }

  function updateRecordById(id, updater) {
    return getAllRecords().then((list) => {
      let changed = false;
      const next = list.map((r) => {
        if (!r || r.id !== id) return r;
        changed = true;
        const updated = updater(r);
        return sanitizeRecord(updated) || r;
      });
      if (!changed) throw new Error('记录不存在，可能已被删除');
      return setAllRecords(next).then(() => next);
    });
  }

  function rememberNewTimeSlotSuggestion(value) {
    const v = String(value || '').trim();
    if (!v) return Promise.resolve();
    ensureConfigured();
    return localforage.getItem(STORAGE_KEY_TIME_SLOT_SUGGESTIONS).then((arr) => {
      const list = Array.isArray(arr) ? arr.slice() : [];
      if (list.indexOf(v) !== -1) return list;
      list.push(v);
      return localforage.setItem(STORAGE_KEY_TIME_SLOT_SUGGESTIONS, list).then(() => list);
    });
  }

  function getTimeSlotSuggestions() {
    ensureConfigured();
    return localforage
      .getItem(STORAGE_KEY_TIME_SLOT_SUGGESTIONS)
      .then((arr) => (Array.isArray(arr) ? arr : []));
  }

  function getCommonStudentNames() {
    ensureConfigured();
    return localforage
      .getItem(STORAGE_KEY_COMMON_STUDENT_NAMES)
      .then((arr) => (Array.isArray(arr) ? arr : []));
  }

  function setCommonStudentNames(names) {
    ensureConfigured();
    const safeNames = [];
    const seen = {};
    const list = Array.isArray(names) ? names : [];
    for (let i = 0; i < list.length; i++) {
      const n = normalizeStudentName(list[i]);
      if (!n || seen[n]) continue;
      seen[n] = true;
      safeNames.push(n);
    }
    return localforage.setItem(STORAGE_KEY_COMMON_STUDENT_NAMES, safeNames).then(() => safeNames);
  }

  function sanitizeTimetableItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const weekday = String(raw.weekday || '').trim();
    if (TIMETABLE_WEEKDAYS.indexOf(weekday) === -1) return null;
    const course = String(raw.course || '').trim();
    if (!course) return null;
    /* slot 允许是对象 {start,end} 或字符串；统一存储为对象 {start,end} */
    const n = normalizeSlot(raw.slot);
    if (!n.structured && !n.raw) return null;
    const slotObj = {
      start: n.start || '',
      end: n.end || '',
    };
    if (!n.structured && n.raw) {
      slotObj.raw = n.raw;
    }
    const lessonType = raw.lessonType === 'retail' ? 'retail' : 'regular';
    return {
      id: raw.id ? String(raw.id) : generateRecordId(),
      weekday,
      slot: slotObj,
      course: course.slice(0, 80),
      lessonType,
      templateId: raw.templateId ? String(raw.templateId).trim() : '',
      updatedAt: typeof raw.updatedAt === 'number' && !Number.isNaN(raw.updatedAt) ? raw.updatedAt : Date.now(),
    };
  }

  function getTimetableList() {
    ensureConfigured();
    return localforage.getItem(STORAGE_KEY_TIMETABLE).then((arr) => {
      const list = Array.isArray(arr) ? arr : [];
      const out = [];
      for (let i = 0; i < list.length; i++) {
        const one = sanitizeTimetableItem(list[i]);
        if (one) out.push(one);
      }
      return out;
    });
  }

  function setTimetableList(list) {
    ensureConfigured();
    const safe = [];
    const arr = Array.isArray(list) ? list : [];
    for (let i = 0; i < arr.length; i++) {
      const one = sanitizeTimetableItem(arr[i]);
      if (one) safe.push(one);
    }
    return localforage.setItem(STORAGE_KEY_TIMETABLE, safe).then(() => safe);
  }

  function getFeedbackDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_FEEDBACK_DRAFT) || '';
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function setFeedbackDraft(payload) {
    try {
      localStorage.setItem(STORAGE_KEY_FEEDBACK_DRAFT, JSON.stringify(payload || {}));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearFeedbackDraft() {
    try {
      localStorage.removeItem(STORAGE_KEY_FEEDBACK_DRAFT);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ───── 积分表相关 ───── */

  function getPointsCourseCategories() {
    ensureConfigured();
    return localforage.getItem(STORAGE_KEY_POINTS_COURSE_CATEGORIES).then((val) => {
      if (val && typeof val === 'object' && !Array.isArray(val)) return val;
      return {};
    });
  }

  function setPointsCourseCategories(map) {
    ensureConfigured();
    const safe = {};
    if (map && typeof map === 'object') {
      for (const [k, v] of Object.entries(map)) {
        if (v === 'trial') safe[String(k)] = 'trial';
      }
    }
    return localforage.setItem(STORAGE_KEY_POINTS_COURSE_CATEGORIES, safe).then(() => safe);
  }

  function getPointsTeacherName() {
    ensureConfigured();
    return localforage.getItem(STORAGE_KEY_POINTS_TEACHER_NAME).then((val) => {
      if (typeof val === 'string') return val;
      return '';
    });
  }

  function setPointsTeacherName(name) {
    ensureConfigured();
    const v = String(name || '').trim();
    return localforage.setItem(STORAGE_KEY_POINTS_TEACHER_NAME, v).then(() => v);
  }

  function getPointsSchoolNames() {
    ensureConfigured();
    return localforage.getItem(STORAGE_KEY_POINTS_SCHOOL_NAMES).then((val) => {
      if (val && typeof val === 'object' && !Array.isArray(val)) return val;
      return {};
    });
  }

  function setPointsSchoolNames(map) {
    ensureConfigured();
    const safe = {};
    if (map && typeof map === 'object') {
      for (const [k, v] of Object.entries(map)) {
        safe[String(k)] = String(v || '').trim();
      }
    }
    return localforage.setItem(STORAGE_KEY_POINTS_SCHOOL_NAMES, safe).then(() => safe);
  }

  /* ───── 课程模板 ───── */

  function generateTemplateName(raw) {
    const course = String(raw.course || '').trim().slice(0, 100);
    const schedule = String(raw.lessonSchedule || '').trim().slice(0, 80);
    let name = course || '未命名模板';
    if (schedule) name = `${name} ${schedule}`;
    return name.slice(0, 50);
  }

  function sanitizeLessonTemplate(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = raw.id ? String(raw.id) : generateRecordId();
    const name = String(raw.name || '').trim().slice(0, 50) || generateTemplateName(raw);
    const course = String(raw.course || '').trim().slice(0, 100);
    const lessonSchedule = String(raw.lessonSchedule || '').trim().slice(0, 120);
    const lessonType = raw.lessonType === 'retail' ? 'retail' : 'regular';
    const classHours = normalizeNonNegativeNumber(raw.classHours);
    const feeRate = normalizeNonNegativeNumber(raw.feeRate);
    const headCount = Math.min(99, Math.max(1, normalizeHeadCount(raw.headCount) || 1));
    const students = Array.isArray(raw.students)
      ? raw.students.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 30)
      : [];
    const teacher = String(raw.teacher || '').trim().slice(0, 40);
    const courseContent = String(raw.courseContent || '').trim().slice(0, 2000);
    const now = Date.now();
    return {
      id,
      name,
      course,
      lessonSchedule,
      lessonType,
      classHours,
      feeRate,
      headCount,
      students,
      teacher,
      courseContent,
      createdAt: typeof raw.createdAt === 'number' && !Number.isNaN(raw.createdAt) ? raw.createdAt : now,
      updatedAt: now,
    };
  }

  function getLessonTemplates() {
    ensureConfigured();
    return localforage.getItem(STORAGE_KEY_LESSON_TEMPLATES).then((arr) => {
      const list = Array.isArray(arr) ? arr : [];
      const out = [];
      for (let i = 0; i < list.length; i++) {
        const one = sanitizeLessonTemplate(list[i]);
        if (one) out.push(one);
      }
      return out;
    });
  }

  function setLessonTemplates(list) {
    ensureConfigured();
    const safe = [];
    const arr = Array.isArray(list) ? list : [];
    for (let i = 0; i < arr.length; i++) {
      const one = sanitizeLessonTemplate(arr[i]);
      if (one) safe.push(one);
    }
    return localforage.setItem(STORAGE_KEY_LESSON_TEMPLATES, safe).then(() => safe);
  }

  function saveLessonTemplate(raw) {
    const tpl = sanitizeLessonTemplate(raw);
    if (!tpl) return Promise.reject(new Error('模板数据无效'));
    return getLessonTemplates().then((list) => {
      list.push(tpl);
      return setLessonTemplates(list).then(() => tpl);
    });
  }

  function updateLessonTemplate(id, updater) {
    return getLessonTemplates().then((list) => {
      let changed = false;
      const next = list.map((t) => {
        if (t.id !== id) return t;
        changed = true;
        const updated = sanitizeLessonTemplate({ ...t, ...(typeof updater === 'function' ? updater(t) : updater) });
        return updated || t;
      });
      if (!changed) throw new Error('模板不存在');
      return setLessonTemplates(next).then(() => next);
    });
  }

  function deleteLessonTemplate(id) {
    return getLessonTemplates().then((list) => {
      const next = list.filter((t) => t.id !== id);
      if (next.length === list.length) throw new Error('模板不存在');
      return setLessonTemplates(next).then(() => next);
    });
  }

  /* ───── 课程分类管理 ───── */

  function getCourseList() {
    ensureConfigured();
    return localforage.getItem(STORAGE_KEY_COURSE_LIST).then((arr) => {
      if (Array.isArray(arr) && arr.length) return arr;
      return ['C++', 'Python', 'Scratch', '信息学基础'];
    });
  }

  function setCourseList(list) {
    ensureConfigured();
    const safe = Array.isArray(list)
      ? list.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 50)
      : [];
    return localforage.setItem(STORAGE_KEY_COURSE_LIST, safe).then(() => safe);
  }

  /* ───── 默认教师姓名 ───── */

  function getDefaultTeacherName() {
    ensureConfigured();
    return localforage.getItem(STORAGE_KEY_DEFAULT_TEACHER_NAME).then((val) => {
      if (typeof val === 'string') return val;
      return '';
    });
  }

  function setDefaultTeacherName(name) {
    ensureConfigured();
    const v = String(name || '').trim();
    return localforage.setItem(STORAGE_KEY_DEFAULT_TEACHER_NAME, v).then(() => v);
  }

  /* ───── 排课数据 (schedule_v1) ───── */

  function sanitizeScheduleItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const weekday = String(raw.weekday || '').trim();
    if (TIMETABLE_WEEKDAYS.indexOf(weekday) === -1) return null;
    const course = String(raw.course || '').trim();
    if (!course) return null;
    const n = normalizeSlot(raw.slot);
    if (!n.structured && !n.raw) return null;
    const slotObj = { start: n.start || '', end: n.end || '' };
    if (!n.structured && n.raw) slotObj.raw = n.raw;
    const lessonType = raw.lessonType === 'retail' ? 'retail' : 'regular';
    const studentGroup = Array.isArray(raw.studentGroup)
      ? raw.studentGroup.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 50)
      : [];
    return {
      id: raw.id ? String(raw.id) : generateRecordId(),
      weekday,
      slot: slotObj,
      course: course.slice(0, 80),
      teacher: String(raw.teacher || '').trim().slice(0, 40),
      classroom: String(raw.classroom || '').trim().slice(0, 40),
      studentGroup,
      lessonType,
      templateId: raw.templateId ? String(raw.templateId).trim() : '',
      resourceId: raw.resourceId ? String(raw.resourceId).trim() : '',
      updatedAt: typeof raw.updatedAt === 'number' && !Number.isNaN(raw.updatedAt) ? raw.updatedAt : Date.now(),
    };
  }

  function getScheduleList() {
    ensureConfigured();
    return localforage.getItem(STORAGE_KEY_SCHEDULE).then((arr) => {
      const list = Array.isArray(arr) ? arr : [];
      const out = [];
      for (let i = 0; i < list.length; i++) {
        const one = sanitizeScheduleItem(list[i]);
        if (one) out.push(one);
      }
      return out;
    });
  }

  function setScheduleList(list) {
    ensureConfigured();
    const safe = [];
    const arr = Array.isArray(list) ? list : [];
    for (let i = 0; i < arr.length; i++) {
      const one = sanitizeScheduleItem(arr[i]);
      if (one) safe.push(one);
    }
    return localforage.setItem(STORAGE_KEY_SCHEDULE, safe).then(() => safe);
  }

  /* ───── 考勤数据 (attendance_v1) ───── */

  function sanitizeAttendanceRecord(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const scheduleItemId = String(raw.scheduleItemId || '').trim();
    if (!scheduleItemId) return null;
    const date = String(raw.date || '').trim();
    if (!date) return null;
    const course = String(raw.course || '').trim();
    if (!course) return null;
    const records = [];
    if (Array.isArray(raw.records)) {
      for (let i = 0; i < raw.records.length; i++) {
        const r = raw.records[i];
        if (!r || typeof r !== 'object') continue;
        const studentName = String(r.studentName || '').trim();
        if (!studentName) continue;
        const status = r.status === 'present' || r.status === 'leave' || r.status === 'absent'
          ? r.status
          : 'present';
        records.push({
          studentName: studentName.slice(0, 30),
          status,
          checkedAt: String(r.checkedAt || '').trim(),
        });
      }
    }
    return {
      id: raw.id ? String(raw.id) : generateRecordId(),
      scheduleItemId,
      date,
      course: course.slice(0, 80),
      teacher: String(raw.teacher || '').trim().slice(0, 40),
      records,
      updatedAt: typeof raw.updatedAt === 'number' && !Number.isNaN(raw.updatedAt) ? raw.updatedAt : Date.now(),
    };
  }

  function getAttendanceRecords() {
    ensureConfigured();
    return localforage.getItem(STORAGE_KEY_ATTENDANCE).then((arr) => {
      const list = Array.isArray(arr) ? arr : [];
      const out = [];
      for (let i = 0; i < list.length; i++) {
        const one = sanitizeAttendanceRecord(list[i]);
        if (one) out.push(one);
      }
      return out;
    });
  }

  function setAttendanceRecords(list) {
    ensureConfigured();
    const safe = [];
    const arr = Array.isArray(list) ? list : [];
    for (let i = 0; i < arr.length; i++) {
      const one = sanitizeAttendanceRecord(arr[i]);
      if (one) safe.push(one);
    }
    return localforage.setItem(STORAGE_KEY_ATTENDANCE, safe).then(() => safe);
  }

  /* ───── 课时账户 (student_hour_accounts_v1) ───── */

  function sanitizeHourAccount(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const studentName = String(raw.studentName || '').trim();
    if (!studentName) return null;
    const course = String(raw.course || '').trim();
    if (!course) return null;
    const totalHours = normalizeNonNegativeNumber(raw.totalHours);
    const consumedHours = normalizeNonNegativeNumber(raw.consumedHours);
    const remainingHours = Math.max(0, normalizeNonNegativeNumber(raw.remainingHours != null ? raw.remainingHours : (totalHours - consumedHours)));
    const rechargeHistory = [];
    if (Array.isArray(raw.rechargeHistory)) {
      for (let i = 0; i < raw.rechargeHistory.length; i++) {
        const r = raw.rechargeHistory[i];
        if (!r || typeof r !== 'object') continue;
        rechargeHistory.push({
          id: r.id ? String(r.id) : generateRecordId(),
          hours: normalizeNonNegativeNumber(r.hours),
          createdAt: typeof r.createdAt === 'number' && !Number.isNaN(r.createdAt) ? r.createdAt : Date.now(),
          note: String(r.note || '').trim().slice(0, 200),
        });
      }
    }
    return {
      id: raw.id ? String(raw.id) : generateRecordId(),
      studentName: studentName.slice(0, 30),
      course: course.slice(0, 80),
      totalHours,
      consumedHours,
      remainingHours,
      rechargeHistory,
    };
  }

  function getHourAccounts() {
    ensureConfigured();
    return localforage.getItem(STORAGE_KEY_HOUR_ACCOUNTS).then((arr) => {
      const list = Array.isArray(arr) ? arr : [];
      const out = [];
      for (let i = 0; i < list.length; i++) {
        const one = sanitizeHourAccount(list[i]);
        if (one) out.push(one);
      }
      return out;
    });
  }

  function setHourAccounts(list) {
    ensureConfigured();
    const safe = [];
    const arr = Array.isArray(list) ? list : [];
    for (let i = 0; i < arr.length; i++) {
      const one = sanitizeHourAccount(arr[i]);
      if (one) safe.push(one);
    }
    return localforage.setItem(STORAGE_KEY_HOUR_ACCOUNTS, safe).then(() => safe);
  }

  /* ───── 资源库 (resource_index_v1) ───── */

  function sanitizeResourceItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const title = String(raw.title || '').trim();
    if (!title) return null;
    const type = ['lesson_plan', 'courseware', 'exercise', 'other'].includes(raw.type)
      ? raw.type
      : 'other';
    const tags = Array.isArray(raw.tags)
      ? raw.tags.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 20)
      : [];
    const now = Date.now();
    return {
      id: raw.id ? String(raw.id) : generateRecordId(),
      title: title.slice(0, 100),
      subject: String(raw.subject || '').trim().slice(0, 50),
      grade: String(raw.grade || '').trim().slice(0, 20),
      type,
      url: String(raw.url || '').trim().slice(0, 500),
      description: String(raw.description || '').trim().slice(0, 2000),
      tags,
      createdAt: typeof raw.createdAt === 'number' && !Number.isNaN(raw.createdAt) ? raw.createdAt : now,
      updatedAt: typeof raw.updatedAt === 'number' && !Number.isNaN(raw.updatedAt) ? raw.updatedAt : now,
    };
  }

  function getResourceList() {
    ensureConfigured();
    return localforage.getItem(STORAGE_KEY_RESOURCE_INDEX).then((arr) => {
      const list = Array.isArray(arr) ? arr : [];
      const out = [];
      for (let i = 0; i < list.length; i++) {
        const one = sanitizeResourceItem(list[i]);
        if (one) out.push(one);
      }
      return out;
    });
  }

  function setResourceList(list) {
    ensureConfigured();
    const safe = [];
    const arr = Array.isArray(list) ? list : [];
    for (let i = 0; i < arr.length; i++) {
      const one = sanitizeResourceItem(arr[i]);
      if (one) safe.push(one);
    }
    return localforage.setItem(STORAGE_KEY_RESOURCE_INDEX, safe).then(() => safe);
  }

  /* ───── 教室自动记忆 (classroom_suggestions_v1) ───── */

  function getClassroomSuggestions() {
    ensureConfigured();
    return localforage
      .getItem(STORAGE_KEY_CLASSROOM_SUGGESTIONS)
      .then((arr) => (Array.isArray(arr) ? arr : []));
  }

  function rememberClassroom(value) {
    const v = String(value || '').trim();
    if (!v) return Promise.resolve([]);
    ensureConfigured();
    return localforage.getItem(STORAGE_KEY_CLASSROOM_SUGGESTIONS).then((arr) => {
      const list = Array.isArray(arr) ? arr.slice() : [];
      if (list.indexOf(v) !== -1) return list;
      list.push(v);
      return localforage.setItem(STORAGE_KEY_CLASSROOM_SUGGESTIONS, list).then(() => list);
    });
  }

  return {
    STORAGE_KEY_RECORDS,
    STORAGE_KEY_TIME_SLOT_SUGGESTIONS,
    STORAGE_KEY_TIMETABLE,
    STORAGE_KEY_COMMON_STUDENT_NAMES,
    STORAGE_KEY_FEEDBACK_DRAFT,
    STORAGE_KEY_SCHEDULE,
    STORAGE_KEY_ATTENDANCE,
    STORAGE_KEY_HOUR_ACCOUNTS,
    STORAGE_KEY_RESOURCE_INDEX,
    STORAGE_KEY_CLASSROOM_SUGGESTIONS,
    TIMETABLE_WEEKDAYS,
    ensureConfigured,
    generateRecordId,
    deriveLessonDateFromDatetimeStr,
    sanitizeRecord,
    sanitizeStudent,
    normalizeLessonType,
    persistLessonRecord,
    getAllRecords,
    setAllRecords,
    deleteRecordById,
    updateRecordById,
    rememberNewTimeSlotSuggestion,
    getTimeSlotSuggestions,
    getCommonStudentNames,
    setCommonStudentNames,
    sanitizeTimetableItem,
    normalizeSlot,
    formatSlot,
    formatChineseSlot,
    formatChineseTime,
    slotStartMinutes,
    getTimetableList,
    setTimetableList,
    getFeedbackDraft,
    setFeedbackDraft,
    clearFeedbackDraft,
    getPointsCourseCategories,
    setPointsCourseCategories,
    getPointsTeacherName,
    setPointsTeacherName,
    getPointsSchoolNames,
    setPointsSchoolNames,
    getLessonTemplates,
    setLessonTemplates,
    saveLessonTemplate,
    updateLessonTemplate,
    deleteLessonTemplate,
    getCourseList,
    setCourseList,
    getDefaultTeacherName,
    setDefaultTeacherName,
    sanitizeScheduleItem,
    getScheduleList,
    setScheduleList,
    sanitizeAttendanceRecord,
    getAttendanceRecords,
    setAttendanceRecords,
    sanitizeHourAccount,
    getHourAccounts,
    setHourAccounts,
    sanitizeResourceItem,
    getResourceList,
    setResourceList,
    getClassroomSuggestions,
    rememberClassroom,
  };
}
