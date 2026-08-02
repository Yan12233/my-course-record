/**
 * useAttendance 课时扣减 + 考勤任务生成 + 预警逻辑测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAttendance } from '../src/composables/useAttendance'
import { TIMETABLE_WEEKDAYS } from '../src/composables/useDatabase'
import { memoryStore } from './setup'

/** 构造排课项 */
function makeScheduleItem(overrides) {
  return {
    id: overrides.id || 'sch-1',
    weekday: overrides.weekday || '周一',
    slot: overrides.slot || { start: '09:00', end: '11:00' },
    course: overrides.course || 'Python',
    teacher: overrides.teacher || '张三',
    classroom: overrides.classroom || '101',
    studentGroup: overrides.studentGroup || ['小明', '小红'],
    lessonType: overrides.lessonType || 'regular',
    templateId: overrides.templateId || '',
    resourceId: overrides.resourceId || '',
    updatedAt: overrides.updatedAt || Date.now(),
  }
}

/** 构造课时账户 */
function makeHourAccount(overrides) {
  return {
    id: overrides.id || 'acc-1',
    studentName: overrides.studentName || '小明',
    course: overrides.course || 'Python',
    totalHours: overrides.totalHours ?? 20,
    consumedHours: overrides.consumedHours ?? 0,
    remainingHours: overrides.remainingHours ?? 20,
    rechargeHistory: overrides.rechargeHistory || [],
  }
}

describe('useAttendance — deductHours', () => {
  beforeEach(() => {
    memoryStore.clear()
  })

  it('签到扣减课时：remainingHours 从 20 减为 18（classHours=2）', async () => {
    memoryStore.set('student_hour_accounts_v1', [
      makeHourAccount({ studentName: '小明', course: 'Python', totalHours: 20, consumedHours: 0, remainingHours: 20 }),
    ])

    const { deductHours, getHourAccounts } = useAttendance()
    await deductHours('小明', 'Python', 2)

    const accounts = await getHourAccounts()
    expect(accounts).toHaveLength(1)
    expect(accounts[0].consumedHours).toBe(2)
    expect(accounts[0].remainingHours).toBe(18)
  })

  it('多次签到累计扣减', async () => {
    memoryStore.set('student_hour_accounts_v1', [
      makeHourAccount({ studentName: '小明', course: 'Python', totalHours: 20, consumedHours: 0, remainingHours: 20 }),
    ])

    const { deductHours, getHourAccounts } = useAttendance()
    await deductHours('小明', 'Python', 2)
    await deductHours('小明', 'Python', 2)

    const accounts = await getHourAccounts()
    expect(accounts[0].consumedHours).toBe(4)
    expect(accounts[0].remainingHours).toBe(16)
  })

  it('扣减后 remainingHours 不会变为负数（边界）', async () => {
    memoryStore.set('student_hour_accounts_v1', [
      makeHourAccount({ studentName: '小明', course: 'Python', totalHours: 2, consumedHours: 0, remainingHours: 2 }),
    ])

    const { deductHours, getHourAccounts } = useAttendance()
    // 扣减 5 课时，但只有 2 课时
    await deductHours('小明', 'Python', 5)

    const accounts = await getHourAccounts()
    expect(accounts[0].consumedHours).toBe(5)
    expect(accounts[0].remainingHours).toBe(0) // 不为负
  })

  it('账户不存在时自动创建（totalHours=0），扣减后 remainingHours=0', async () => {
    const { deductHours, getHourAccounts } = useAttendance()
    await deductHours('新学生', 'C++', 2)

    const accounts = await getHourAccounts()
    expect(accounts).toHaveLength(1)
    expect(accounts[0].studentName).toBe('新学生')
    expect(accounts[0].course).toBe('C++')
    expect(accounts[0].totalHours).toBe(0)
    expect(accounts[0].consumedHours).toBe(2)
    expect(accounts[0].remainingHours).toBe(0)
  })

  it('浮点课时精确扣减（1.5 课时）', async () => {
    memoryStore.set('student_hour_accounts_v1', [
      makeHourAccount({ studentName: '小明', course: 'Python', totalHours: 10, consumedHours: 0, remainingHours: 10 }),
    ])

    const { deductHours, getHourAccounts } = useAttendance()
    await deductHours('小明', 'Python', 1.5)

    const accounts = await getHourAccounts()
    expect(accounts[0].consumedHours).toBe(1.5)
    expect(accounts[0].remainingHours).toBe(8.5)
  })

  it('不同学生不同课程独立扣减', async () => {
    memoryStore.set('student_hour_accounts_v1', [
      makeHourAccount({ id: 'acc-1', studentName: '小明', course: 'Python', totalHours: 20, remainingHours: 20 }),
      makeHourAccount({ id: 'acc-2', studentName: '小明', course: 'C++', totalHours: 10, remainingHours: 10 }),
      makeHourAccount({ id: 'acc-3', studentName: '小红', course: 'Python', totalHours: 15, remainingHours: 15 }),
    ])

    const { deductHours, getHourAccounts } = useAttendance()
    await deductHours('小明', 'Python', 2)
    await deductHours('小明', 'C++', 3)
    await deductHours('小红', 'Python', 1)

    const accounts = await getHourAccounts()
    const mingPython = accounts.find(a => a.studentName === '小明' && a.course === 'Python')
    const mingCpp = accounts.find(a => a.studentName === '小明' && a.course === 'C++')
    const hongPython = accounts.find(a => a.studentName === '小红' && a.course === 'Python')

    expect(mingPython.remainingHours).toBe(18)
    expect(mingCpp.remainingHours).toBe(7)
    expect(hongPython.remainingHours).toBe(14)
  })
})

describe('useAttendance — rechargeHours', () => {
  beforeEach(() => {
    memoryStore.clear()
  })

  it('充值课时：totalHours 和 remainingHours 增加', async () => {
    memoryStore.set('student_hour_accounts_v1', [
      makeHourAccount({ studentName: '小明', course: 'Python', totalHours: 10, consumedHours: 4, remainingHours: 6 }),
    ])

    const { rechargeHours, getHourAccounts } = useAttendance()
    await rechargeHours('小明', 'Python', 20, '续费')

    const accounts = await getHourAccounts()
    expect(accounts[0].totalHours).toBe(30)
    expect(accounts[0].remainingHours).toBe(26) // 30 - 4 = 26
    expect(accounts[0].rechargeHistory).toHaveLength(1)
    expect(accounts[0].rechargeHistory[0].hours).toBe(20)
    expect(accounts[0].rechargeHistory[0].note).toBe('续费')
  })

  it('账户不存在时自动创建并充值', async () => {
    const { rechargeHours, getHourAccounts } = useAttendance()
    await rechargeHours('新学生', 'Java', 30, '首次充值')

    const accounts = await getHourAccounts()
    expect(accounts).toHaveLength(1)
    expect(accounts[0].totalHours).toBe(30)
    expect(accounts[0].remainingHours).toBe(30)
    expect(accounts[0].consumedHours).toBe(0)
  })

  it('多次充值累计', async () => {
    memoryStore.set('student_hour_accounts_v1', [
      makeHourAccount({ studentName: '小明', course: 'Python', totalHours: 10, consumedHours: 0, remainingHours: 10 }),
    ])

    const { rechargeHours, getHourAccounts } = useAttendance()
    await rechargeHours('小明', 'Python', 5, '第一次')
    await rechargeHours('小明', 'Python', 10, '第二次')

    const accounts = await getHourAccounts()
    expect(accounts[0].totalHours).toBe(25)
    expect(accounts[0].remainingHours).toBe(25)
    expect(accounts[0].rechargeHistory).toHaveLength(2)
  })
})

describe('useAttendance — generateTodayTasks', () => {
  beforeEach(() => {
    memoryStore.clear()
  })

  it('根据当日星期匹配排课项生成考勤任务', async () => {
    const today = new Date().getDay()
    const todayWeekday = TIMETABLE_WEEKDAYS[(today + 6) % 7]
    const otherWeekday = TIMETABLE_WEEKDAYS[((today + 6) + 1) % 7]

    const scheduleItems = [
      makeScheduleItem({ id: 'sch-today', weekday: todayWeekday, course: 'Python', studentGroup: ['小明', '小红'] }),
      makeScheduleItem({ id: 'sch-other', weekday: otherWeekday, course: 'C++', studentGroup: ['小王'] }),
    ]

    const { generateTodayTasks } = useAttendance()
    const tasks = await generateTodayTasks(scheduleItems)

    expect(tasks).toHaveLength(1)
    expect(tasks[0].scheduleItemId).toBe('sch-today')
    expect(tasks[0].course).toBe('Python')
    expect(tasks[0].studentGroup).toEqual(['小明', '小红'])
  })

  it('每个排课项生成一条考勤任务，包含 studentGroup 学生名单', async () => {
    const today = new Date().getDay()
    const todayWeekday = TIMETABLE_WEEKDAYS[(today + 6) % 7]

    const scheduleItems = [
      makeScheduleItem({ id: 'sch-1', weekday: todayWeekday, course: 'Python', studentGroup: ['小明', '小红', '小王'] }),
      makeScheduleItem({ id: 'sch-2', weekday: todayWeekday, course: 'C++', studentGroup: ['小李'] }),
    ]

    const { generateTodayTasks } = useAttendance()
    const tasks = await generateTodayTasks(scheduleItems)

    expect(tasks).toHaveLength(2)
    expect(tasks[0].studentGroup).toHaveLength(3)
    expect(tasks[1].studentGroup).toHaveLength(1)
  })

  it('空排课数据返回空任务列表', async () => {
    const { generateTodayTasks } = useAttendance()
    const tasks = await generateTodayTasks([])
    expect(tasks).toEqual([])
  })

  it('null 排课数据返回空任务列表', async () => {
    const { generateTodayTasks } = useAttendance()
    const tasks = await generateTodayTasks(null)
    expect(tasks).toEqual([])
  })

  it('已有考勤记录时 existingRecord 不为 null', async () => {
    const today = new Date().getDay()
    const todayWeekday = TIMETABLE_WEEKDAYS[(today + 6) % 7]
    const todayIso = new Date().toISOString().slice(0, 10)

    const scheduleItems = [
      makeScheduleItem({ id: 'sch-1', weekday: todayWeekday, course: 'Python' }),
    ]

    // 写入已有考勤记录
    memoryStore.set('attendance_v1', [
      {
        id: 'att-1',
        scheduleItemId: 'sch-1',
        date: todayIso,
        course: 'Python',
        teacher: '张三',
        records: [{ studentName: '小明', status: 'present', checkedAt: '2024-01-01T09:00:00' }],
        updatedAt: Date.now(),
      },
    ])

    const { generateTodayTasks } = useAttendance()
    const tasks = await generateTodayTasks(scheduleItems)

    expect(tasks).toHaveLength(1)
    expect(tasks[0].existingRecord).not.toBeNull()
    expect(tasks[0].existingRecord.id).toBe('att-1')
  })
})

describe('useAttendance — getWarningStudents', () => {
  beforeEach(() => {
    memoryStore.clear()
  })

  it('remainingHours <= 阈值的学生被预警', async () => {
    memoryStore.set('student_hour_accounts_v1', [
      makeHourAccount({ id: 'a1', studentName: '小明', course: 'Python', remainingHours: 3 }),
      makeHourAccount({ id: 'a2', studentName: '小红', course: 'Python', remainingHours: 5 }),
      makeHourAccount({ id: 'a3', studentName: '小王', course: 'C++', remainingHours: 4 }),
    ])

    const { getWarningStudents } = useAttendance()
    const warnings = await getWarningStudents(4)

    expect(warnings).toHaveLength(2)
    expect(warnings.some(w => w.studentName === '小明')).toBe(true)
    expect(warnings.some(w => w.studentName === '小王')).toBe(true)
    expect(warnings.some(w => w.studentName === '小红')).toBe(false)
  })

  it('阈值=0 时只有 remainingHours=0 的被预警', async () => {
    memoryStore.set('student_hour_accounts_v1', [
      makeHourAccount({ id: 'a1', studentName: '小明', course: 'Python', remainingHours: 0 }),
      makeHourAccount({ id: 'a2', studentName: '小红', course: 'Python', remainingHours: 1 }),
    ])

    const { getWarningStudents } = useAttendance()
    const warnings = await getWarningStudents(0)

    expect(warnings).toHaveLength(1)
    expect(warnings[0].studentName).toBe('小明')
  })

  it('空账户列表返回空数组', async () => {
    const { getWarningStudents } = useAttendance()
    const warnings = await getWarningStudents(4)
    expect(warnings).toEqual([])
  })
})

describe('useAttendance — saveAttendanceRecord', () => {
  beforeEach(() => {
    memoryStore.clear()
  })

  it('保存考勤记录到 attendance_v1', async () => {
    const { saveAttendanceRecord, getAttendanceRecords } = useAttendance()
    const record = {
      id: 'att-1',
      scheduleItemId: 'sch-1',
      date: '2024-10-15',
      course: 'Python',
      teacher: '张三',
      records: [
        { studentName: '小明', status: 'present', checkedAt: '2024-10-15T09:02:00' },
        { studentName: '小红', status: 'leave', checkedAt: '2024-10-15T09:02:00' },
      ],
    }

    await saveAttendanceRecord(record)
    const records = await getAttendanceRecords()
    expect(records).toHaveLength(1)
    expect(records[0].scheduleItemId).toBe('sch-1')
    expect(records[0].records).toHaveLength(2)
  })

  it('同一 scheduleItemId + date 的记录被替换（不是追加）', async () => {
    memoryStore.set('attendance_v1', [
      {
        id: 'att-old',
        scheduleItemId: 'sch-1',
        date: '2024-10-15',
        course: 'Python',
        teacher: '张三',
        records: [{ studentName: '小明', status: 'present', checkedAt: '2024-10-15T09:00:00' }],
        updatedAt: 1000,
      },
    ])

    const { saveAttendanceRecord, getAttendanceRecords } = useAttendance()
    const newRecord = {
      id: 'att-new',
      scheduleItemId: 'sch-1',
      date: '2024-10-15',
      course: 'Python',
      teacher: '张三',
      records: [
        { studentName: '小明', status: 'absent', checkedAt: '2024-10-15T10:00:00' },
        { studentName: '小红', status: 'present', checkedAt: '2024-10-15T10:00:00' },
      ],
      updatedAt: 2000,
    }

    await saveAttendanceRecord(newRecord)
    const records = await getAttendanceRecords()
    expect(records).toHaveLength(1) // 不是 2
    expect(records[0].id).toBe('att-new')
    expect(records[0].records).toHaveLength(2)
  })
})
