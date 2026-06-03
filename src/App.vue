<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import CalendarMonthView from './components/CalendarMonthView.vue';
import DayLessonsView from './components/DayLessonsView.vue';
import LessonEditorView from './components/LessonEditorView.vue';
import SettingsSheet from './components/SettingsSheet.vue';
import SaveSuccessModal from './components/Modals/SaveSuccessModal.vue';
import TimetableModal from './components/Modals/TimetableModal.vue';
import BatchImportModal from './components/Modals/BatchImportModal.vue';
import RecordDetailModal from './components/Modals/RecordDetailModal.vue';
import { useDatabase } from './composables/useDatabase';
import { useImageHandler } from './composables/useImageHandler';
import { useExport } from './composables/useExport';
import { useShare } from './composables/useShare';
import { buildRecordsByDateMap, sumRecords } from './composables/useLessonSummary';
import { formatIsoLocalDate, formatYearMonth, recordBelongsToDate } from './utils/lessonDate';
import { computeLessonFee, getRetailHeadCount, normalizeHeadCount } from './utils/lessonFee';

const {
  ensureConfigured,
  sanitizeStudent,
  persistLessonRecord,
  getAllRecords,
  setAllRecords,
  deleteRecordById,
  updateRecordById,
  getTimetableList,
  setTimetableList,
  getTimeSlotSuggestions,
  rememberNewTimeSlotSuggestion,
  getCommonStudentNames,
  setCommonStudentNames,
  getFeedbackDraft,
  setFeedbackDraft,
  TIMETABLE_WEEKDAYS,
  generateRecordId,
  sanitizeTimetableItem,
} = useDatabase();
const { compressImageFileForStorage, readFileAsDataURL } = useImageHandler();
const { exportFeedbackExcel, exportMonthZip, exportMonthFeeExcel, exportYearFeeExcel } = useExport();
const { buildLessonReportText, copyPasteTextPromise, shareLessonRecordViaSystem, getRuntimeInteractionHint } =
  useShare();

const appView = ref('calendar');
const selectedMonth = ref(formatYearMonth(new Date()));
const selectedDate = ref('');
const editingRecordId = ref(null);
const advancedFeedbackExpanded = ref(false);
const showSettings = ref(false);

const feedbackFormState = reactive({
  subject: 'C++',
  classSchedule: '',
  lessonDate: '',
  teacher: '',
  classTime: '',
  admin: '林玲',
  courseContent: '',
  lessonType: 'regular',
  classHours: '',
  feeRate: '',
  headCount: '1',
});
const studentsDraft = ref([]);
const newStudentName = ref('');

const pickedFile = ref(null);
const previewUrl = ref('');
const photoHint = ref('尚未选择图片');
let previewObjectUrl = null;

const datetimeDisplay = ref('');
let clockTimer = null;

const courseSuggestions = ref(['C++', 'Python', 'Scratch', '信息学基础']);
const timeSlotSuggestions = ref([
  '下午2点-4点',
  '下午4点-6点',
  '上午9点-11点',
  '晚上7点-9点',
  '周六下午2点-4点',
  '周日下午',
]);

const records = ref([]);
const filterText = ref('');
const exportMonth = ref('');
const exportFeeYear = ref(String(new Date().getFullYear()));
const exportingZip = ref(false);
const exportingFeeMonth = ref(false);
const exportingFeeYear = ref(false);
const saveInFlight = ref(false);

const showTimetable = ref(false);
const showBatchImport = ref(false);
const timetableItems = ref([]);
const timetableForm = reactive({ weekday: '周一', slot: '', course: '' });
const timetableEditingId = ref(null);

const showRecordDetail = ref(false);
const currentRecord = ref(null);
const detailEditValues = reactive({
  course: '',
  lessonSchedule: '',
  lessonDate: '',
  lessonType: 'regular',
  classHours: '',
  feeRate: '',
  headCount: '1',
});
const currentDetailImageFile = ref(null);
const detailImageClearRequested = ref(false);
const detailImageHint = ref('');
let detailTempImageObjectUrl = null;

const showSaveSuccess = ref(false);
const saveSuccessImage = ref('');
const saveSuccessHint = ref('');
const saveSuccessEnvHint = ref('');

const restoreInputRef = ref(null);

const toastMessage = ref('');
const toastVisible = ref(false);
let toastTimer = null;
let draftSaveTimer = null;

const todayIso = computed(() => formatIsoLocalDate(new Date()));
const recordsByDate = computed(() => buildRecordsByDateMap(records.value, selectedMonth.value));
const monthSummary = computed(() => sumRecords(records.value, { yearMonth: selectedMonth.value }));
const dayRecords = computed(() => {
  const iso = selectedDate.value;
  if (!iso) return [];
  return records.value.filter((r) => recordBelongsToDate(r, iso));
});
const daySummary = computed(() => sumRecords(records.value, { isoDate: selectedDate.value }));

const filteredRecords = computed(() => {
  const kw = String(filterText.value || '').trim().toLowerCase();
  if (!kw) return records.value;
  return records.value.filter((r) => {
    const text = [r.course, r.lessonSchedule, r.lessonDate, r.datetime].join(' ').toLowerCase();
    return text.includes(kw);
  });
});

const timetableEditing = computed(() => !!timetableEditingId.value);

function showToast(msg) {
  toastMessage.value = msg;
  toastVisible.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastVisible.value = false;
    toastMessage.value = '';
  }, 2600);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatNow() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function tickClock() {
  datetimeDisplay.value = formatNow();
}

function normalizeStudentName(name) {
  return String(name == null ? '' : name).trim().slice(0, 30);
}

function normalizeNonNegativeInt(v) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

function parseMetricNumber(v) {
  const n = parseFloat(String(v ?? '').trim());
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function createStudentDraft(name) {
  return {
    name: normalizeStudentName(name),
    hwDone: 0,
    hwTotal: 1,
    cwDone: 0,
    cwTotal: 1,
    feedback: '',
  };
}

function getStudentsForSave() {
  const out = [];
  for (let i = 0; i < studentsDraft.value.length; i++) {
    const one = sanitizeStudent(studentsDraft.value[i]);
    if (one) out.push(one);
  }
  return out;
}

function getFeedbackFormData() {
  const subject = String(feedbackFormState.subject || '').trim();
  const classSchedule = String(feedbackFormState.classSchedule || '').trim();
  const lessonDateText = String(feedbackFormState.lessonDate || '').trim();
  const teacher = String(feedbackFormState.teacher || '').trim();
  const classTimeRaw = String(feedbackFormState.classTime || '').trim();
  const admin = String(feedbackFormState.admin || '林玲').trim() || '林玲';
  const courseContent = String(feedbackFormState.courseContent || '').trim();
  const lessonType = feedbackFormState.lessonType === 'retail' ? 'retail' : 'regular';
  const classHours = parseMetricNumber(feedbackFormState.classHours);
  const feeRate = parseMetricNumber(feedbackFormState.feeRate);
  const students = getStudentsForSave();
  const headCount =
    lessonType === 'retail' ? Math.max(1, normalizeHeadCount(feedbackFormState.headCount)) : 0;
  const classFee = computeLessonFee({
    lessonType,
    classHours,
    feeRate,
    headCount,
  });
  return {
    subject,
    classSchedule,
    teacher,
    classTime: classTimeRaw || (lessonDateText ? `${lessonDateText} ${classSchedule}`.trim() : ''),
    admin,
    courseContent,
    students,
    lessonType,
    classHours,
    headCount,
    feeRate,
    classFee,
    advancedFeedbackEnabled: advancedFeedbackExpanded.value,
  };
}

function hasCurrentLessonImage() {
  if (pickedFile.value) return true;
  const url = String(previewUrl.value || '').trim();
  return url.length > 0 && (url.startsWith('data:') || url.startsWith('blob:'));
}

function validateBeforeSave() {
  if (feedbackFormState.lessonType !== 'retail') return null;
  const fd = getFeedbackFormData();
  if (!hasCurrentLessonImage()) return '零售课请先拍照或上传课堂图片';
  if (!fd.teacher) return '零售课请填写教师姓名';
  if (!fd.courseContent) return '零售课请填写今日授课内容';
  if (!fd.students.length) return '零售课请至少添加一名学生';
  return null;
}

function addStudent() {
  const normalized = normalizeStudentName(newStudentName.value);
  if (!normalized) {
    showToast('请输入学生姓名后再添加');
    return;
  }
  const exists = studentsDraft.value.some(
    (s) => String(s.name || '').trim().toLowerCase() === normalized.toLowerCase(),
  );
  if (exists) {
    showToast('该学生已在列表中');
    return;
  }
  studentsDraft.value.push(createStudentDraft(normalized));
  newStudentName.value = '';
}

function removeStudent(idx) {
  studentsDraft.value.splice(idx, 1);
}

function stepStudent(idx, field, step) {
  const row = studentsDraft.value[idx];
  if (!row) return;
  const current = normalizeNonNegativeInt(row[field]);
  const min = field === 'hwTotal' || field === 'cwTotal' ? 1 : 0;
  let next = current + step;
  if (next < min) next = min;
  row[field] = next;
}

function updateStudentField(idx, field, value) {
  const row = studentsDraft.value[idx];
  if (!row) return;
  if (field === 'feedback') {
    row.feedback = String(value || '');
    return;
  }
  let n = normalizeNonNegativeInt(value);
  if (field === 'hwTotal' || field === 'cwTotal') n = Math.max(1, n);
  row[field] = n;
}

function clearCurrentPhotoSelection() {
  pickedFile.value = null;
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
  previewUrl.value = '';
  photoHint.value = '尚未选择图片';
}

function onPickPhoto(file) {
  pickedFile.value = file || null;
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
  if (file) {
    photoHint.value = `已选：${file.name}`;
    previewObjectUrl = URL.createObjectURL(file);
    previewUrl.value = previewObjectUrl;
  } else {
    photoHint.value = '尚未选择图片';
    previewUrl.value = '';
  }
}

function resetLessonForm(isoDate) {
  feedbackFormState.subject = 'C++';
  feedbackFormState.classSchedule = '';
  feedbackFormState.lessonDate = isoDate || selectedDate.value || formatIsoLocalDate(new Date());
  feedbackFormState.teacher = '';
  feedbackFormState.classTime = '';
  feedbackFormState.admin = '林玲';
  feedbackFormState.courseContent = '';
  feedbackFormState.lessonType = 'regular';
  feedbackFormState.classHours = '';
  feedbackFormState.feeRate = '';
  feedbackFormState.headCount = '1';
  advancedFeedbackExpanded.value = false;
  studentsDraft.value = [];
  newStudentName.value = '';
  clearCurrentPhotoSelection();
}

function loadRecordIntoForm(item) {
  if (!item) return;
  feedbackFormState.subject = String(item.subject || item.course || 'C++').trim() || 'C++';
  feedbackFormState.classSchedule = String(item.classSchedule || item.lessonSchedule || '').trim();
  feedbackFormState.lessonDate = String(item.lessonDate || selectedDate.value || '').trim();
  feedbackFormState.teacher = String(item.teacher || '').trim();
  feedbackFormState.classTime = String(item.classTime || '').trim();
  feedbackFormState.admin = String(item.admin || '林玲').trim() || '林玲';
  feedbackFormState.courseContent = String(item.courseContent || '').trim();
  feedbackFormState.lessonType = item.lessonType === 'retail' ? 'retail' : 'regular';
  feedbackFormState.classHours = item.classHours != null && item.classHours !== 0 ? String(item.classHours) : '';
  feedbackFormState.feeRate = item.feeRate != null && item.feeRate !== 0 ? String(item.feeRate) : '';
  const hc = item.headCount != null && item.headCount > 0 ? item.headCount : getRetailHeadCount(item);
  feedbackFormState.headCount = item.lessonType === 'retail' ? String(Math.max(1, hc || 1)) : '1';
  advancedFeedbackExpanded.value =
    feedbackFormState.lessonType === 'retail' || !!item.advancedFeedbackEnabled;
  const studs = [];
  if (Array.isArray(item.students)) {
    for (let i = 0; i < item.students.length; i++) {
      const one = sanitizeStudent(item.students[i]);
      if (one) studs.push(one);
    }
  }
  studentsDraft.value = studs;
  clearCurrentPhotoSelection();
  if (item.imageBase64) {
    previewUrl.value = item.imageBase64;
    photoHint.value = '已载入原记录图片';
  }
}

function onSelectDay(iso) {
  selectedDate.value = iso;
  appView.value = 'day';
}

function onBackToCalendar() {
  appView.value = 'calendar';
}

function onBackToDay() {
  appView.value = 'day';
}

function startAddLesson() {
  editingRecordId.value = null;
  resetLessonForm(selectedDate.value);
  appView.value = 'lesson';
}

function startEditLesson(item) {
  editingRecordId.value = item?.id || null;
  loadRecordIntoForm(item);
  appView.value = 'lesson';
}

function toggleAdvancedFeedback() {
  advancedFeedbackExpanded.value = !advancedFeedbackExpanded.value;
}

watch(
  () => feedbackFormState.lessonType,
  (t) => {
    if (t === 'retail') {
      advancedFeedbackExpanded.value = true;
      if (normalizeHeadCount(feedbackFormState.headCount) < 1) {
        feedbackFormState.headCount = '1';
      }
    }
  },
);

async function refreshRecords() {
  records.value = await getAllRecords();
}

async function refreshTimetable() {
  timetableItems.value = await getTimetableList();
}

async function onSaveCopy() {
  if (saveInFlight.value) {
    showToast('正在保存中，请稍候…');
    return;
  }
  const validationError = validateBeforeSave();
  if (validationError) {
    showToast(validationError);
    return;
  }

  saveInFlight.value = true;
  try {
    const when = datetimeDisplay.value || formatNow();
    const formData = getFeedbackFormData();
    const course = String(feedbackFormState.subject || '').trim() || '（未填写课程）';
    const lessonSchedule = String(feedbackFormState.classSchedule || '');
    const lessonDateRaw = String(feedbackFormState.lessonDate || selectedDate.value || '');
    const text = buildLessonReportText(course, lessonSchedule);

    await rememberNewTimeSlotSuggestion(lessonSchedule);
    const fileToStore = await compressImageFileForStorage(pickedFile.value);

    if (editingRecordId.value) {
      let newImage = null;
      if (fileToStore) {
        const dataUrl = await readFileAsDataURL(fileToStore);
        newImage = {
          imageBase64: typeof dataUrl === 'string' ? dataUrl : null,
          imageFileName: fileToStore.name || null,
          imageMimeType: fileToStore.type || 'image/jpeg',
        };
      } else if (previewUrl.value && previewUrl.value.startsWith('data:')) {
        newImage = {
          imageBase64: previewUrl.value,
          imageFileName: null,
          imageMimeType: 'image/jpeg',
        };
      }

      await updateRecordById(editingRecordId.value, (oldRec) => {
        const next = {
          ...oldRec,
          datetime: when,
          course,
          lessonSchedule,
          lessonDate: lessonDateRaw,
          subject: formData.subject,
          classSchedule: formData.classSchedule,
          teacher: formData.teacher,
          classTime: formData.classTime,
          admin: formData.admin,
          courseContent: formData.courseContent,
          students: formData.students,
          lessonType: formData.lessonType,
          classHours: formData.classHours,
          headCount: formData.headCount,
          feeRate: formData.feeRate,
          classFee: formData.classFee,
          advancedFeedbackEnabled: formData.advancedFeedbackEnabled,
        };
        if (newImage) {
          next.imageBase64 = newImage.imageBase64;
          next.imageFileName = newImage.imageFileName;
          next.imageMimeType = newImage.imageMimeType;
        }
        return next;
      });
      await refreshRecords();
      const copied = await copyPasteTextPromise(text);
      if (!copied) showToast('已更新记录，但复制失败');
      else showToast('记录已更新，汇报文字已复制');
      editingRecordId.value = null;
      appView.value = 'day';
      resetLessonForm(selectedDate.value);
      return;
    }

    const saved = await persistLessonRecord(
      when,
      course,
      fileToStore,
      lessonSchedule,
      lessonDateRaw,
      formData,
    );
    await refreshRecords();
    const copied = await copyPasteTextPromise(text);
    if (!copied) {
      showToast('本地已保存，但复制失败，请手动复制');
    }
    saveSuccessImage.value = saved && saved.imageBase64 ? saved.imageBase64 : '';
    saveSuccessHint.value = saved.imageBase64
      ? '🎉 文字已自动复制！请【长按下方图片】选择复制，然后打开微信粘贴发送。'
      : '🎉 文字已自动复制！请打开微信，在对话中长按输入框粘贴发送。';
    saveSuccessEnvHint.value = getRuntimeInteractionHint();
    showSaveSuccess.value = true;
    editingRecordId.value = null;
    appView.value = 'day';
    resetLessonForm(selectedDate.value);
  } catch (err) {
    console.error(err);
    showToast(`保存失败：${(err && err.message) || '未知错误'}`);
  } finally {
    saveInFlight.value = false;
  }
}

async function onExportExcel() {
  if (feedbackFormState.lessonType !== 'retail' && !advancedFeedbackExpanded.value) {
    showToast('请先选择零售课或展开高级填写后再导出反馈表');
    return;
  }
  try {
    const formData = getFeedbackFormData();
    await exportFeedbackExcel(formData);
    showToast('Excel 已导出');
  } catch (err) {
    showToast((err && err.message) || 'Excel 导出失败');
  }
}

async function onExportMonthZip() {
  if (exportingZip.value) return;
  exportingZip.value = true;
  try {
    const title = await exportMonthZip(records.value, exportMonth.value);
    showToast(`已生成并下载：${title}`);
  } catch (err) {
    showToast((err && err.message) || '导出失败');
  } finally {
    exportingZip.value = false;
  }
}

async function onExportMonthFeeExcel() {
  if (exportingFeeMonth.value) return;
  exportingFeeMonth.value = true;
  try {
    const title = await exportMonthFeeExcel(records.value, exportMonth.value);
    showToast(`已导出：${title}`);
  } catch (err) {
    showToast((err && err.message) || '导出失败');
  } finally {
    exportingFeeMonth.value = false;
  }
}

async function onExportYearFeeExcel() {
  if (exportingFeeYear.value) return;
  exportingFeeYear.value = true;
  try {
    const title = await exportYearFeeExcel(records.value, exportFeeYear.value);
    showToast(`已导出：${title}`);
  } catch (err) {
    showToast((err && err.message) || '导出失败');
  } finally {
    exportingFeeYear.value = false;
  }
}

async function onSaveCommonStudents() {
  try {
    const names = studentsDraft.value.map((s) => s.name);
    const saved = await setCommonStudentNames(names);
    if (!saved.length) {
      showToast('当前没有可保存的学生姓名');
      return;
    }
    showToast('常用名单已保存');
  } catch (err) {
    showToast('保存常用名单失败');
  }
}

async function onLoadCommonStudents() {
  try {
    const names = await getCommonStudentNames();
    const next = [];
    for (let i = 0; i < names.length; i++) {
      const n = normalizeStudentName(names[i]);
      if (!n) continue;
      next.push(createStudentDraft(n));
    }
    if (!next.length) {
      showToast('暂无可载入的常用名单');
      return;
    }
    studentsDraft.value = next;
    showToast('已载入常用名单');
  } catch (err) {
    showToast('载入常用名单失败');
  }
}

function openRecord(item) {
  currentRecord.value = item;
  detailEditValues.course = String(item?.course || '').trim() || '（未填写课程）';
  detailEditValues.lessonSchedule = String(item?.lessonSchedule || '').trim();
  detailEditValues.lessonDate = String(item?.lessonDate || '').trim();
  detailEditValues.lessonType = item?.lessonType === 'retail' ? 'retail' : 'regular';
  detailEditValues.classHours =
    item?.classHours != null && item.classHours !== 0 ? String(item.classHours) : '';
  detailEditValues.feeRate = item?.feeRate != null && item.feeRate !== 0 ? String(item.feeRate) : '';
  const dhc = item?.headCount > 0 ? item.headCount : getRetailHeadCount(item);
  detailEditValues.headCount =
    item?.lessonType === 'retail' ? String(Math.max(1, dhc || 1)) : '1';
  resetDetailTempImageSelection();
  showRecordDetail.value = true;
  showSettings.value = false;
}

const detailImageUrl = computed(() => {
  if (detailTempImageObjectUrl) return detailTempImageObjectUrl;
  if (detailImageClearRequested.value) return '';
  if (currentRecord.value && typeof currentRecord.value.imageBase64 === 'string') {
    return currentRecord.value.imageBase64;
  }
  return '';
});

const detailRemoveImageDisabled = computed(() => {
  const hasOriginal =
    !!(currentRecord.value && currentRecord.value.imageBase64 && currentRecord.value.imageBase64.length > 0);
  const hasTemp = !!currentDetailImageFile.value;
  return !(hasTemp || (hasOriginal && !detailImageClearRequested.value));
});

function resetDetailTempImageSelection() {
  currentDetailImageFile.value = null;
  detailImageClearRequested.value = false;
  detailImageHint.value = '';
  if (detailTempImageObjectUrl) {
    URL.revokeObjectURL(detailTempImageObjectUrl);
    detailTempImageObjectUrl = null;
  }
}

function onReplaceDetailImage(file) {
  if (!file) return;
  if (!(file.type && /^image\//i.test(file.type))) {
    showToast('请选择图片文件');
    return;
  }
  detailImageClearRequested.value = false;
  currentDetailImageFile.value = file;
  if (detailTempImageObjectUrl) {
    URL.revokeObjectURL(detailTempImageObjectUrl);
    detailTempImageObjectUrl = null;
  }
  detailTempImageObjectUrl = URL.createObjectURL(file);
  detailImageHint.value = `已选新图：${file.name}`;
}

function onRemoveDetailImage() {
  if (!currentRecord.value) return;
  detailImageClearRequested.value = true;
  currentDetailImageFile.value = null;
  if (detailTempImageObjectUrl) {
    URL.revokeObjectURL(detailTempImageObjectUrl);
    detailTempImageObjectUrl = null;
  }
  detailImageHint.value = '已标记：保存后将移除本条图片';
}

function closeRecordDetailModal() {
  showRecordDetail.value = false;
  resetDetailTempImageSelection();
}

async function onDeleteRecord() {
  if (!currentRecord.value || !currentRecord.value.id) return;
  try {
    await deleteRecordById(currentRecord.value.id);
    closeRecordDetailModal();
    currentRecord.value = null;
    await refreshRecords();
    showToast('已删除');
  } catch (err) {
    showToast('删除失败');
  }
}

async function onShareRecord() {
  if (!currentRecord.value) return;
  try {
    const recForShare = {
      ...currentRecord.value,
      course: String(detailEditValues.course || '').trim() || '（未填写课程）',
      lessonSchedule: String(detailEditValues.lessonSchedule || '').trim(),
      lessonDate: String(detailEditValues.lessonDate || '').trim(),
      imageBase64: detailImageUrl.value || null,
    };
    const res = await shareLessonRecordViaSystem(recForShare);
    if (res && res.ok) {
      showToast(res.textOnlyShared ? '已发送文字分享' : '已调用系统分享');
      return;
    }
    if (res && res.cancelled) return;
    showToast('无法调起分享，请改用复制文案');
  } catch (err) {
    showToast('分享失败，请改用复制文案');
  }
}

async function onCopyRecordText() {
  if (!currentRecord.value) return;
  const t = buildLessonReportText(detailEditValues.course, detailEditValues.lessonSchedule);
  const ok = await copyPasteTextPromise(t);
  showToast(ok ? '汇报文字已复制' : '复制失败');
}

async function onSaveRecordDetail() {
  if (!currentRecord.value || !currentRecord.value.id) return;
  if (detailEditValues.lessonType === 'retail') {
    const hasImg =
      !!currentDetailImageFile.value ||
      (!detailImageClearRequested.value &&
        !!(currentRecord.value.imageBase64 && currentRecord.value.imageBase64.length));
    if (!hasImg) {
      showToast('零售课记录必须保留课堂图片');
      return;
    }
  }
  try {
    let newImage = null;
    if (currentDetailImageFile.value) {
      const compressed = await compressImageFileForStorage(currentDetailImageFile.value);
      if (compressed) {
        const dataUrl = await readFileAsDataURL(compressed);
        newImage = {
          imageBase64: typeof dataUrl === 'string' ? dataUrl : null,
          imageFileName: compressed.name || null,
          imageMimeType: compressed.type || 'image/jpeg',
        };
      }
    }

    const nextList = await updateRecordById(currentRecord.value.id, (oldRec) => {
      const clearImg = !!detailImageClearRequested.value && !newImage;
      const lessonType = detailEditValues.lessonType === 'retail' ? 'retail' : 'regular';
      const classHours = parseMetricNumber(detailEditValues.classHours);
      const feeRate = parseMetricNumber(detailEditValues.feeRate);
      const headCount =
        lessonType === 'retail' ? Math.max(1, normalizeHeadCount(detailEditValues.headCount)) : 0;
      const classFee = computeLessonFee({ lessonType, classHours, feeRate, headCount });
      return {
        ...oldRec,
        course: String(detailEditValues.course || '').trim() || '（未填写课程）',
        lessonSchedule: String(detailEditValues.lessonSchedule || '').trim(),
        lessonDate: String(detailEditValues.lessonDate || '').trim(),
        lessonType,
        classHours,
        headCount,
        feeRate,
        classFee,
        imageBase64: clearImg
          ? null
          : newImage
            ? newImage.imageBase64
            : oldRec.imageBase64 || null,
        imageFileName: clearImg
          ? null
          : newImage
            ? newImage.imageFileName
            : oldRec.imageFileName || null,
        imageMimeType: clearImg
          ? null
          : newImage
            ? newImage.imageMimeType
            : oldRec.imageMimeType || null,
      };
    });

    const updated = nextList.find((it) => it && it.id === currentRecord.value.id) || null;
    currentRecord.value = updated;
    if (updated) {
      detailEditValues.course = String(updated.course || '').trim() || '（未填写课程）';
      detailEditValues.lessonSchedule = String(updated.lessonSchedule || '').trim();
      detailEditValues.lessonDate = String(updated.lessonDate || '').trim();
      detailEditValues.lessonType = updated.lessonType === 'retail' ? 'retail' : 'regular';
      detailEditValues.classHours =
        updated.classHours != null && updated.classHours !== 0 ? String(updated.classHours) : '';
      detailEditValues.feeRate =
        updated.feeRate != null && updated.feeRate !== 0 ? String(updated.feeRate) : '';
      const uhc = updated.headCount > 0 ? updated.headCount : getRetailHeadCount(updated);
      detailEditValues.headCount =
        updated.lessonType === 'retail' ? String(Math.max(1, uhc || 1)) : '1';
    }
    resetDetailTempImageSelection();
    await refreshRecords();
    showToast('本条记录已更新');
  } catch (err) {
    console.error(err);
    showToast(`更新失败：${(err && err.message) || '未知错误'}`);
  }
}

function downloadJsonBackup(data, fileName) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function onBackupRecords() {
  const data = await getAllRecords();
  downloadJsonBackup(data, `lesson-records-backup-${formatIsoLocalDate(new Date())}.json`);
  showToast('备份已下载');
}

function onRestoreClick() {
  if (!restoreInputRef.value) return;
  restoreInputRef.value.value = '';
  restoreInputRef.value.click();
}

function readTextFromFile(file) {
  if (!file) return Promise.reject(new Error('未选择文件'));
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
    reader.readAsText(file, 'utf-8');
  });
}

async function onRestoreFileChange(e) {
  const file = e.target?.files?.[0];
  if (!file) return;
  try {
    const text = await readTextFromFile(file);
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('备份格式错误');
    await setAllRecords(data);
    await refreshRecords();
    showToast('恢复成功');
  } catch (err) {
    showToast(`恢复失败：${(err && err.message) || '未知错误'}`);
  }
}

function resetTimetableForm() {
  timetableForm.weekday = '周一';
  timetableForm.slot = '';
  timetableForm.course = '';
  timetableEditingId.value = null;
}

function onTimetableBeginEdit(item) {
  if (!item) return;
  timetableEditingId.value = item.id;
  timetableForm.weekday = item.weekday;
  timetableForm.slot = item.slot;
  timetableForm.course = item.course;
}

async function onTimetableSubmit() {
  const one = sanitizeTimetableItem({
    id: timetableEditingId.value || generateRecordId(),
    weekday: timetableForm.weekday,
    slot: timetableForm.slot,
    course: timetableForm.course,
    updatedAt: Date.now(),
  });
  if (!one) {
    showToast('请填写完整的星期、时间段和课程名');
    return;
  }
  const wasEdit = !!timetableEditingId.value;
  let list = timetableItems.value.slice();
  if (wasEdit) {
    list = list.map((it) => (it.id === timetableEditingId.value ? one : it));
  } else {
    list.push(one);
  }
  timetableItems.value = await setTimetableList(list);
  resetTimetableForm();
  showToast(wasEdit ? '课表已更新' : '已添加课表项');
}

async function onTimetableDelete(id) {
  const list = timetableItems.value.filter((it) => it.id !== id);
  timetableItems.value = await setTimetableList(list);
  if (timetableEditingId.value === id) resetTimetableForm();
  showToast('已删除课表项');
}

function onPickBatch() {
  showToast('批量补录功能开发中，敬请期待');
}

watch(
  () => ({
    form: { ...feedbackFormState },
    students: studentsDraft.value,
    advanced: advancedFeedbackExpanded.value,
  }),
  () => {
    if (appView.value !== 'lesson') return;
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    draftSaveTimer = window.setTimeout(() => {
      setFeedbackDraft({
        version: 2,
        updatedAt: Date.now(),
        form: { ...feedbackFormState },
        students: getStudentsForSave(),
        advancedFeedbackExpanded: advancedFeedbackExpanded.value,
      });
    }, 120);
  },
  { deep: true },
);

onMounted(async () => {
  ensureConfigured();
  tickClock();
  clockTimer = window.setInterval(tickClock, 1000);
  exportMonth.value = formatYearMonth(new Date());
  exportFeeYear.value = String(new Date().getFullYear());

  const draft = getFeedbackDraft();
  if (draft && draft.form) {
    Object.assign(feedbackFormState, draft.form);
    if (Array.isArray(draft.students)) {
      studentsDraft.value = draft.students;
    }
    if (draft.advancedFeedbackExpanded) {
      advancedFeedbackExpanded.value = true;
    }
  }

  const slots = await getTimeSlotSuggestions();
  if (slots && slots.length) {
    const merged = [...timeSlotSuggestions.value];
    for (let i = 0; i < slots.length; i++) {
      if (merged.indexOf(slots[i]) === -1) merged.push(slots[i]);
    }
    timeSlotSuggestions.value = merged;
  }

  await refreshRecords();
  await refreshTimetable();
});

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer);
  if (toastTimer) clearTimeout(toastTimer);
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  if (detailTempImageObjectUrl) URL.revokeObjectURL(detailTempImageObjectUrl);
});
</script>

<template>
  <main
    class="mx-auto max-w-md px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))]"
    :class="appView === 'calendar' ? 'pb-24' : 'pb-[env(safe-area-inset-bottom)]'"
  >
    <CalendarMonthView
      v-if="appView === 'calendar'"
      v-model:year-month="selectedMonth"
      :records-by-date="recordsByDate"
      :today-iso="todayIso"
      @select-day="onSelectDay"
      @open-settings="showSettings = true"
    />

    <DayLessonsView
      v-else-if="appView === 'day'"
      :iso-date="selectedDate"
      :records="dayRecords"
      :day-summary="daySummary"
      @back="onBackToCalendar"
      @add-lesson="startAddLesson"
      @edit-record="startEditLesson"
      @open-record="openRecord"
    />

    <LessonEditorView
      v-else-if="appView === 'lesson'"
      :iso-date="selectedDate"
      :photo-hint="photoHint"
      :preview-url="previewUrl"
      :course="feedbackFormState.subject"
      :lesson-schedule="feedbackFormState.classSchedule"
      :lesson-date="feedbackFormState.lessonDate"
      :datetime-display="datetimeDisplay"
      :course-suggestions="courseSuggestions"
      :time-slot-suggestions="timeSlotSuggestions"
      :lesson-type="feedbackFormState.lessonType"
      :class-hours="feedbackFormState.classHours"
      :fee-rate="feedbackFormState.feeRate"
      :head-count="feedbackFormState.headCount"
      :advanced-expanded="advancedFeedbackExpanded"
      :teacher="feedbackFormState.teacher"
      :admin="feedbackFormState.admin"
      :class-time="feedbackFormState.classTime"
      :course-content="feedbackFormState.courseContent"
      :students="studentsDraft"
      :new-student-name="newStudentName"
      :save-pending="saveInFlight"
      :is-edit-mode="!!editingRecordId"
      @back="onBackToDay"
      @pick-photo="onPickPhoto"
      @update:course="feedbackFormState.subject = $event"
      @update:lesson-schedule="feedbackFormState.classSchedule = $event"
      @update:lesson-date="feedbackFormState.lessonDate = $event"
      @update:lesson-type="feedbackFormState.lessonType = $event"
      @update:class-hours="feedbackFormState.classHours = $event"
      @update:fee-rate="feedbackFormState.feeRate = $event"
      @update:head-count="feedbackFormState.headCount = $event"
      @toggle-advanced="toggleAdvancedFeedback"
      @update:teacher="feedbackFormState.teacher = $event"
      @update:admin="feedbackFormState.admin = $event"
      @update:class-time="feedbackFormState.classTime = $event"
      @update:course-content="feedbackFormState.courseContent = $event"
      @update:new-student-name="newStudentName = $event"
      @add-student="addStudent"
      @remove-student="removeStudent"
      @step-student="stepStudent"
      @update-student-field="updateStudentField"
      @save-common="onSaveCommonStudents"
      @load-common="onLoadCommonStudents"
      @save-copy="onSaveCopy"
      @export-excel="onExportExcel"
    />

    <input
      ref="restoreInputRef"
      type="file"
      accept="application/json,.json"
      class="sr-only"
      @change="onRestoreFileChange"
    />

    <SaveSuccessModal
      :visible="showSaveSuccess"
      :image-url="saveSuccessImage"
      :hint="saveSuccessHint"
      :env-hint="saveSuccessEnvHint"
      @close="showSaveSuccess = false"
      @sent="
        showSaveSuccess = false;
        clearCurrentPhotoSelection();
      "
    />

    <SettingsSheet
      :visible="showSettings"
      :records="filteredRecords"
      :filter-text="filterText"
      :export-month="exportMonth"
      :export-fee-year="exportFeeYear"
      :exporting-zip="exportingZip"
      :exporting-fee-month="exportingFeeMonth"
      :exporting-fee-year="exportingFeeYear"
      @close="showSettings = false"
      @open-timetable="
        showSettings = false;
        showTimetable = true;
      "
      @open-batch-import="
        showSettings = false;
        showBatchImport = true;
      "
      @update:filter-text="filterText = $event"
      @update:export-month="exportMonth = $event"
      @export-month-zip="onExportMonthZip"
      @export-fee-month="onExportMonthFeeExcel"
      @export-fee-year="onExportYearFeeExcel"
      @update:export-fee-year="exportFeeYear = $event"
      @refresh="refreshRecords"
      @backup="onBackupRecords"
      @restore="onRestoreClick"
      @open-record="openRecord"
    />

    <TimetableModal
      :visible="showTimetable"
      :items="timetableItems"
      :weekdays="TIMETABLE_WEEKDAYS"
      :form-values="timetableForm"
      :editing="timetableEditing"
      @close="showTimetable = false"
      @submit="onTimetableSubmit"
      @cancel-edit="resetTimetableForm"
      @delete="onTimetableDelete"
      @begin-edit="onTimetableBeginEdit"
      @update:weekday="timetableForm.weekday = $event"
      @update:slot="timetableForm.slot = $event"
      @update:course="timetableForm.course = $event"
    />

    <BatchImportModal :visible="showBatchImport" :rows="[]" @close="showBatchImport = false" />

    <RecordDetailModal
      :visible="showRecordDetail"
      :record="currentRecord"
      :edit-values="detailEditValues"
      :image-url="detailImageUrl"
      :image-hint="detailImageHint"
      :remove-image-disabled="detailRemoveImageDisabled"
      @close="closeRecordDetailModal"
      @update:course="detailEditValues.course = $event"
      @update:lesson-schedule="detailEditValues.lessonSchedule = $event"
      @update:lesson-date="detailEditValues.lessonDate = $event"
      @update:lesson-type="detailEditValues.lessonType = $event"
      @update:class-hours="detailEditValues.classHours = $event"
      @update:fee-rate="detailEditValues.feeRate = $event"
      @update:head-count="detailEditValues.headCount = $event"
      @replace-image="onReplaceDetailImage"
      @remove-image="onRemoveDetailImage"
      @delete="onDeleteRecord"
      @copy="onCopyRecordText"
      @share="onShareRecord"
      @save="onSaveRecordDetail"
    />
  </main>

  <div
    v-if="appView === 'calendar'"
    class="fixed left-0 right-0 z-40 mx-auto max-w-md border-t border-slate-200 bg-white/95 px-4 py-3 text-center text-sm text-slate-700 backdrop-blur"
    style="bottom: max(0px, env(safe-area-inset-bottom))"
  >
    本月合计：
    <span class="font-semibold text-indigo-700">{{ monthSummary.totalHours }}</span>
    课时 ·
    <span class="font-semibold text-emerald-700">¥{{ monthSummary.totalFee }}</span>
    <span class="text-slate-400">（{{ monthSummary.count }} 节）</span>
  </div>

  <div
    class="pointer-events-none fixed left-1/2 z-[200] w-[min(92vw,22rem)] -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm leading-snug text-white shadow-xl shadow-slate-900/20 transition-opacity duration-200"
    style="bottom: max(1.25rem, env(safe-area-inset-bottom))"
    :class="[
      toastVisible ? 'opacity-100' : 'opacity-0 hidden',
      appView === 'calendar' ? '!bottom-20' : '',
    ]"
  >
    {{ toastMessage }}
  </div>
</template>
