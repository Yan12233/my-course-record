import localforage from 'localforage';
import { useImageHandler } from './useImageHandler';
import { deriveLessonDateFromDatetimeStr } from '../utils/lessonDate';
import { computeLessonFee, normalizeHeadCount } from '../utils/lessonFee';

const STORAGE_KEY_RECORDS = 'course_records_v1';
const STORAGE_KEY_TIME_SLOT_SUGGESTIONS = 'time_slot_suggestions_v1';
const STORAGE_KEY_TIMETABLE = 'my_timetable';
const STORAGE_KEY_COMMON_STUDENT_NAMES = 'common_student_names_v1';
const STORAGE_KEY_FEEDBACK_DRAFT = 'feedback_form_draft_v1';
const TIMETABLE_WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

let configured = false;

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

  function generateRecordId() {
    if (window.crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
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
    const slot = String(raw.slot || '').trim();
    const course = String(raw.course || '').trim();
    if (!slot || !course) return null;
    return {
      id: raw.id ? String(raw.id) : generateRecordId(),
      weekday,
      slot: slot.slice(0, 80),
      course: course.slice(0, 80),
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

  return {
    STORAGE_KEY_RECORDS,
    STORAGE_KEY_TIME_SLOT_SUGGESTIONS,
    STORAGE_KEY_TIMETABLE,
    STORAGE_KEY_COMMON_STUDENT_NAMES,
    STORAGE_KEY_FEEDBACK_DRAFT,
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
    getTimetableList,
    setTimetableList,
    getFeedbackDraft,
    setFeedbackDraft,
    clearFeedbackDraft,
  };
}
