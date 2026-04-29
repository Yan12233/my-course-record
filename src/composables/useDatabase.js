import localforage from 'localforage';
import { useImageHandler } from './useImageHandler';

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

  function deriveLessonDateFromDatetimeStr(dtStr) {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(dtStr || '').trim());
    return m ? m[1] : '';
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

    const record = {
      id: generateRecordId(),
      datetime,
      course,
      lessonSchedule:
        lessonSchedule && typeof lessonSchedule === 'string' && lessonSchedule.trim().length > 0
          ? lessonSchedule.trim()
          : '',
      lessonDate: lessonDateStored || '',
      subject: feedbackData && typeof feedbackData.subject === 'string' ? feedbackData.subject.trim() : (course || ''),
      classSchedule:
        feedbackData && typeof feedbackData.classSchedule === 'string'
          ? feedbackData.classSchedule.trim()
          : (lessonSchedule || ''),
      teacher: feedbackData && typeof feedbackData.teacher === 'string' ? feedbackData.teacher.trim() : '',
      classTime: feedbackData && typeof feedbackData.classTime === 'string' ? feedbackData.classTime.trim() : '',
      admin: feedbackData && typeof feedbackData.admin === 'string' ? feedbackData.admin.trim() : '林玲',
      courseContent:
        feedbackData && typeof feedbackData.courseContent === 'string' ? feedbackData.courseContent.trim() : '',
      students: feedbackData && Array.isArray(feedbackData.students) ? feedbackData.students.slice() : [],
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
    return localforage.getItem(STORAGE_KEY_RECORDS).then((arr) => (Array.isArray(arr) ? arr : []));
  }

  function setAllRecords(list) {
    ensureConfigured();
    return localforage.setItem(STORAGE_KEY_RECORDS, Array.isArray(list) ? list : []);
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
        return updater(r);
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
    sanitizeStudent,
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
