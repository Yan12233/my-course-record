<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import HeaderSection from './components/HeaderSection.vue';
import PhotoUploader from './components/PhotoUploader.vue';
import CourseForm from './components/CourseForm.vue';
import FeedbackForm from './components/FeedbackForm.vue';
import StudentManager from './components/StudentManager.vue';
import ActionButtons from './components/ActionButtons.vue';
import RecordsLibrary from './components/RecordsLibrary.vue';
import SaveSuccessModal from './components/Modals/SaveSuccessModal.vue';
import TimetableModal from './components/Modals/TimetableModal.vue';
import BatchImportModal from './components/Modals/BatchImportModal.vue';
import RecordDetailModal from './components/Modals/RecordDetailModal.vue';
import { useDatabase } from './composables/useDatabase';
import { useImageHandler } from './composables/useImageHandler';
import { useExport } from './composables/useExport';
import { useShare } from './composables/useShare';

const {
  ensureConfigured,
  sanitizeStudent,
  persistLessonRecord,
  getAllRecords,
  setAllRecords,
  deleteRecordById,
  updateRecordById,
  getTimetableList,
  getTimeSlotSuggestions,
  rememberNewTimeSlotSuggestion,
  getCommonStudentNames,
  setCommonStudentNames,
  getFeedbackDraft,
  setFeedbackDraft,
} = useDatabase();
const { compressImageFileForStorage, readFileAsDataURL } = useImageHandler();
const { exportFeedbackExcel, exportMonthZip } = useExport();
const { buildLessonReportText, copyPasteTextPromise, shareLessonRecordViaSystem, getRuntimeInteractionHint } =
  useShare();

const feedbackFormState = reactive({
  subject: '',
  classSchedule: '',
  lessonDate: '',
  teacher: '',
  classTime: '',
  admin: '林玲',
  courseContent: '',
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
const exportingZip = ref(false);
const saveInFlight = ref(false);

const showTimetable = ref(false);
const showBatchImport = ref(false);
const timetableItems = ref([]);

const showRecordDetail = ref(false);
const currentRecord = ref(null);
const detailEditValues = reactive({
  course: '',
  lessonSchedule: '',
  lessonDate: '',
});
const currentDetailImageFile = ref(null);
const detailImageClearRequested = ref(false);
const detailImageHint = ref('');
let detailTempImageObjectUrl = null;

const showSaveSuccess = ref(false);
const saveSuccessImage = ref('');
const saveSuccessHint = ref('');
const saveSuccessEnvHint = ref('');

const smartPrefillVisible = ref(false);
let smartPrefillTimer = null;

const restoreInputRef = ref(null);
const hiddenDatePickerRef = ref(null);

const toastMessage = ref('');
const toastVisible = ref(false);
let toastTimer = null;
let draftSaveTimer = null;

const filteredRecords = computed(() => {
  const kw = String(filterText.value || '').trim().toLowerCase();
  if (!kw) return records.value;
  return records.value.filter((r) => {
    const text = [r.course, r.lessonSchedule, r.lessonDate, r.datetime].join(' ').toLowerCase();
    return text.includes(kw);
  });
});

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

function formatIsoLocalDate(d) {
  const x = d instanceof Date ? d : new Date();
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
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
  return {
    subject,
    classSchedule,
    teacher,
    classTime: classTimeRaw || (lessonDateText ? `${lessonDateText} ${classSchedule}`.trim() : ''),
    admin,
    courseContent,
    students: getStudentsForSave(),
  };
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

function onPickBatch(files) {
  showToast(`已选择 ${files.length} 张图片，批量补录逻辑将在下一阶段接入`);
}

function openDatePicker() {
  const el = hiddenDatePickerRef.value;
  if (!el) return;
  const cur = String(feedbackFormState.lessonDate || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cur)) {
    el.value = cur;
  }
  if (typeof el.showPicker === 'function') {
    el.showPicker();
  } else {
    el.click();
  }
}

function onDatePicked(e) {
  const v = e.target?.value || '';
  if (v) feedbackFormState.lessonDate = v;
}

function showSmartPrefillHint() {
  smartPrefillVisible.value = true;
  if (smartPrefillTimer) clearTimeout(smartPrefillTimer);
  smartPrefillTimer = window.setTimeout(() => {
    smartPrefillVisible.value = false;
  }, 3000);
}

function parseTimeRangeFromSlotText(slotText) {
  const s = String(slotText || '').trim();
  if (!s) return null;
  const m = /(\d{1,2})[:：](\d{2})\s*[-~到至]\s*(\d{1,2})[:：](\d{2})/.exec(s);
  if (!m) return null;
  const sh = parseInt(m[1], 10);
  const sm = parseInt(m[2], 10);
  const eh = parseInt(m[3], 10);
  const em = parseInt(m[4], 10);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (end <= start) return null;
  return { start, end };
}

async function applySmartPrefillByTimetable() {
  const weekdayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const now = new Date();
  const weekday = weekdayMap[now.getDay()];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const list = timetableItems.value.slice();
  let best = null;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item || item.weekday !== weekday) continue;
    const range = parseTimeRangeFromSlotText(item.slot);
    if (!range) continue;
    const winStart = range.start - 30;
    const winEnd = range.end;
    if (nowMin < winStart || nowMin > winEnd) continue;
    const score = Math.abs(nowMin - range.start);
    if (!best || score < best.score) best = { item, score };
  }
  if (!best) return false;
  if (!String(feedbackFormState.subject || '').trim()) {
    feedbackFormState.subject = best.item.course;
  }
  if (!String(feedbackFormState.classSchedule || '').trim()) {
    feedbackFormState.classSchedule = best.item.slot;
  }
  showSmartPrefillHint();
  return true;
}

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
  saveInFlight.value = true;
  try {
    const when = datetimeDisplay.value || formatNow();
    const formData = getFeedbackFormData();
    const course = String(feedbackFormState.subject || '').trim() || '（未填写课程）';
    const lessonSchedule = String(feedbackFormState.classSchedule || '');
    const lessonDateRaw = String(feedbackFormState.lessonDate || '');
    const text = buildLessonReportText(course, lessonSchedule);

    await rememberNewTimeSlotSuggestion(lessonSchedule);
    const fileToStore = await compressImageFileForStorage(pickedFile.value);
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
  } catch (err) {
    console.error(err);
    showToast(`保存失败：${(err && err.message) || '未知错误'}`);
  } finally {
    saveInFlight.value = false;
  }
}

async function onExportExcel() {
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
  resetDetailTempImageSelection();
  showRecordDetail.value = true;
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
      return {
        ...oldRec,
        course: String(detailEditValues.course || '').trim() || '（未填写课程）',
        lessonSchedule: String(detailEditValues.lessonSchedule || '').trim(),
        lessonDate: String(detailEditValues.lessonDate || '').trim(),
        imageBase64: clearImg
          ? null
          : (newImage ? newImage.imageBase64 : (oldRec.imageBase64 || null)),
        imageFileName: clearImg
          ? null
          : (newImage ? newImage.imageFileName : (oldRec.imageFileName || null)),
        imageMimeType: clearImg
          ? null
          : (newImage ? newImage.imageMimeType : (oldRec.imageMimeType || null)),
      };
    });

    const updated = nextList.find((it) => it && it.id === currentRecord.value.id) || null;
    currentRecord.value = updated;
    if (updated) {
      detailEditValues.course = String(updated.course || '').trim() || '（未填写课程）';
      detailEditValues.lessonSchedule = String(updated.lessonSchedule || '').trim();
      detailEditValues.lessonDate = String(updated.lessonDate || '').trim();
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

watch(
  () => ({
    form: { ...feedbackFormState },
    students: studentsDraft.value,
  }),
  () => {
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    draftSaveTimer = window.setTimeout(() => {
      setFeedbackDraft({
        version: 1,
        updatedAt: Date.now(),
        form: { ...feedbackFormState },
        students: getStudentsForSave(),
      });
    }, 120);
  },
  { deep: true },
);

onMounted(async () => {
  ensureConfigured();
  tickClock();
  clockTimer = window.setInterval(tickClock, 1000);
  feedbackFormState.lessonDate = formatIsoLocalDate(new Date());
  exportMonth.value = `${new Date().getFullYear()}-${pad2(new Date().getMonth() + 1)}`;

  const draft = getFeedbackDraft();
  if (draft && draft.form) {
    Object.assign(feedbackFormState, draft.form);
    if (Array.isArray(draft.students)) {
      studentsDraft.value = draft.students;
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
  await applySmartPrefillByTimetable();
});

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer);
  if (smartPrefillTimer) clearTimeout(smartPrefillTimer);
  if (toastTimer) clearTimeout(toastTimer);
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  if (detailTempImageObjectUrl) URL.revokeObjectURL(detailTempImageObjectUrl);
});
</script>

<template>
  <main
    class="mx-auto max-w-md space-y-6 px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]"
  >
    <HeaderSection :smart-prefill-visible="smartPrefillVisible" @open-timetable="showTimetable = true" />

    <PhotoUploader
      :photo-hint="photoHint"
      :preview-url="previewUrl"
      @pick-photo="onPickPhoto"
      @pick-batch="onPickBatch"
      @open-batch-import="showBatchImport = true"
    />

    <CourseForm
      :course="feedbackFormState.subject"
      :lesson-schedule="feedbackFormState.classSchedule"
      :lesson-date="feedbackFormState.lessonDate"
      :datetime-display="datetimeDisplay"
      :course-suggestions="courseSuggestions"
      :time-slot-suggestions="timeSlotSuggestions"
      @update:course="feedbackFormState.subject = $event"
      @update:lesson-schedule="feedbackFormState.classSchedule = $event"
      @update:lesson-date="feedbackFormState.lessonDate = $event"
      @open-date-picker="openDatePicker"
    />

    <FeedbackForm
      :teacher="feedbackFormState.teacher"
      :admin="feedbackFormState.admin"
      :class-time="feedbackFormState.classTime"
      :course-content="feedbackFormState.courseContent"
      @update:teacher="feedbackFormState.teacher = $event"
      @update:admin="feedbackFormState.admin = $event"
      @update:class-time="feedbackFormState.classTime = $event"
      @update:course-content="feedbackFormState.courseContent = $event"
    />

    <section class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <StudentManager
        :students="studentsDraft"
        :new-student-name="newStudentName"
        @update:new-student-name="newStudentName = $event"
        @add-student="addStudent"
        @remove-student="removeStudent"
        @step-student="stepStudent"
        @update-student-field="updateStudentField"
        @save-common="onSaveCommonStudents"
        @load-common="onLoadCommonStudents"
      />
    </section>

    <ActionButtons :save-pending="saveInFlight" @save-copy="onSaveCopy" @export-excel="onExportExcel" />

    <RecordsLibrary
      :records="filteredRecords"
      :filter-text="filterText"
      :export-month="exportMonth"
      :exporting-zip="exportingZip"
      @update:filter-text="filterText = $event"
      @update:export-month="exportMonth = $event"
      @export-month-zip="onExportMonthZip"
      @refresh="refreshRecords"
      @backup="onBackupRecords"
      @restore="onRestoreClick"
      @open-record="openRecord"
    />

    <input ref="restoreInputRef" type="file" accept="application/json,.json" class="sr-only" @change="onRestoreFileChange" />
    <input
      ref="hiddenDatePickerRef"
      type="date"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      @change="onDatePicked"
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
    <TimetableModal :visible="showTimetable" :items="timetableItems" @close="showTimetable = false" />
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
      @update:lessonSchedule="detailEditValues.lessonSchedule = $event"
      @update:lessonDate="detailEditValues.lessonDate = $event"
      @replace-image="onReplaceDetailImage"
      @remove-image="onRemoveDetailImage"
      @delete="onDeleteRecord"
      @copy="onCopyRecordText"
      @share="onShareRecord"
      @save="onSaveRecordDetail"
    />
  </main>

  <div
    class="pointer-events-none fixed left-1/2 z-[200] w-[min(92vw,22rem)] -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm leading-snug text-white shadow-xl shadow-slate-900/20 transition-opacity duration-200"
    style="bottom: max(1.25rem, env(safe-area-inset-bottom))"
    :class="toastVisible ? 'opacity-100' : 'opacity-0 hidden'"
  >
    {{ toastMessage }}
  </div>
</template>
