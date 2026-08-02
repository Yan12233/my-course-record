/**
 * useSchedule 冲突检测 + 迁移逻辑测试
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useSchedule } from '../src/composables/useSchedule'
import { useDatabase, TIMETABLE_WEEKDAYS } from '../src/composables/useDatabase'
import { memoryStore } from './setup'

const db = useDatabase()

/** 写入排课数据到内存存储 */
async function setScheduleData(items) {
  memoryStore.set('schedule_v1', items)
}

/** 构造排课项 */
function makeItem(overrides) {
  return {
    id: overrides.id || 'item-1',
    weekday: overrides.weekday || '周一',
    slot: overrides.slot || { start: '09:00', end: '11:00' },
    course: overrides.course || 'Python',
    teacher: overrides.teacher || '张三',
    classroom: overrides.classroom || '101',
    studentGroup: overrides.studentGroup || [],
    lessonType: overrides.lessonType || 'regular',
    templateId: overrides.templateId || '',
    resourceId: overrides.resourceId || '',
    updatedAt: overrides.updatedAt || Date.now(),
    ...overrides,
  }
}

describe('useSchedule — isSlotOverlap', () => {
  const { isSlotOverlap } = useSchedule()

  it('完全相同的时间段应判定为重叠', () => {
    const slotA = { start: '09:00', end: '11:00' }
    const slotB = { start: '09:00', end: '11:00' }
    expect(isSlotOverlap(slotA, slotB)).toBe(true)
  })

  it('部分重叠（09:00-11:00 与 10:00-12:00）应判定为重叠', () => {
    const slotA = { start: '09:00', end: '11:00' }
    const slotB = { start: '10:00', end: '12:00' }
    expect(isSlotOverlap(slotA, slotB)).toBe(true)
  })

  it('不重叠的相邻时段（09:00-11:00 与 11:00-13:00）应判定为不重叠', () => {
    const slotA = { start: '09:00', end: '11:00' }
    const slotB = { start: '11:00', end: '13:00' }
    expect(isSlotOverlap(slotA, slotB)).toBe(false)
  })

  it('完全不重叠的时段应判定为不重叠', () => {
    const slotA = { start: '09:00', end: '10:00' }
    const slotB = { start: '14:00', end: '16:00' }
    expect(isSlotOverlap(slotA, slotB)).toBe(false)
  })

  it('包含关系（09:00-17:00 包含 10:00-11:00）应判定为重叠', () => {
    const slotA = { start: '09:00', end: '17:00' }
    const slotB = { start: '10:00', end: '11:00' }
    expect(isSlotOverlap(slotA, slotB)).toBe(true)
  })

  it('3小时时段与2小时时段部分重叠（09:00-12:00 与 11:00-13:00）应判定为重叠', () => {
    const slotA = { start: '09:00', end: '12:00' }
    const slotB = { start: '11:00', end: '13:00' }
    expect(isSlotOverlap(slotA, slotB)).toBe(true)
  })

  it('3小时时段与2小时时段不重叠（09:00-12:00 与 12:00-14:00）应判定为不重叠', () => {
    const slotA = { start: '09:00', end: '12:00' }
    const slotB = { start: '12:00', end: '14:00' }
    expect(isSlotOverlap(slotA, slotB)).toBe(false)
  })

  it('1小时时段与1小时时段相邻不重叠（09:00-10:00 与 10:00-11:00）应判定为不重叠', () => {
    const slotA = { start: '09:00', end: '10:00' }
    const slotB = { start: '10:00', end: '11:00' }
    expect(isSlotOverlap(slotA, slotB)).toBe(false)
  })

  it('无法解析的时间应返回 false（不重叠）', () => {
    const slotA = { start: '', end: '' }
    const slotB = { start: '09:00', end: '11:00' }
    expect(isSlotOverlap(slotA, slotB)).toBe(false)
  })

  it('反向部分重叠（10:00-12:00 与 09:00-11:00）应判定为重叠', () => {
    const slotA = { start: '10:00', end: '12:00' }
    const slotB = { start: '09:00', end: '11:00' }
    expect(isSlotOverlap(slotA, slotB)).toBe(true)
  })
})

describe('useSchedule — checkTeacherConflict', () => {
  beforeEach(() => {
    memoryStore.clear()
  })

  it('同一教师同一星期同一时段应检测到冲突', async () => {
    const existing = makeItem({
      id: 'existing-1',
      teacher: '张三',
      weekday: '周一',
      slot: { start: '09:00', end: '11:00' },
    })
    await setScheduleData([existing])

    const { checkTeacherConflict } = useSchedule()
    const conflict = await checkTeacherConflict('张三', '周一', { start: '09:00', end: '11:00' })
    expect(conflict).not.toBeNull()
    expect(conflict.course).toBe('Python')
  })

  it('不同教师不冲突', async () => {
    const existing = makeItem({
      id: 'existing-1',
      teacher: '张三',
      weekday: '周一',
      slot: { start: '09:00', end: '11:00' },
    })
    await setScheduleData([existing])

    const { checkTeacherConflict } = useSchedule()
    const conflict = await checkTeacherConflict('李四', '周一', { start: '09:00', end: '11:00' })
    expect(conflict).toBeNull()
  })

  it('同一教师不同星期不冲突', async () => {
    const existing = makeItem({
      id: 'existing-1',
      teacher: '张三',
      weekday: '周一',
      slot: { start: '09:00', end: '11:00' },
    })
    await setScheduleData([existing])

    const { checkTeacherConflict } = useSchedule()
    const conflict = await checkTeacherConflict('张三', '周二', { start: '09:00', end: '11:00' })
    expect(conflict).toBeNull()
  })

  it('同一教师同一星期不重叠的时段不冲突', async () => {
    const existing = makeItem({
      id: 'existing-1',
      teacher: '张三',
      weekday: '周一',
      slot: { start: '09:00', end: '11:00' },
    })
    await setScheduleData([existing])

    const { checkTeacherConflict } = useSchedule()
    const conflict = await checkTeacherConflict('张三', '周一', { start: '14:00', end: '16:00' })
    expect(conflict).toBeNull()
  })

  it('excludeId 应排除自身（编辑场景）', async () => {
    const existing = makeItem({
      id: 'item-1',
      teacher: '张三',
      weekday: '周一',
      slot: { start: '09:00', end: '11:00' },
    })
    await setScheduleData([existing])

    const { checkTeacherConflict } = useSchedule()
    const conflict = await checkTeacherConflict('张三', '周一', { start: '09:00', end: '11:00' }, 'item-1')
    expect(conflict).toBeNull()
  })

  it('空教师名不检测冲突', async () => {
    const { checkTeacherConflict } = useSchedule()
    const conflict = await checkTeacherConflict('', '周一', { start: '09:00', end: '11:00' })
    expect(conflict).toBeNull()
  })

  it('空排课数据时无冲突', async () => {
    const { checkTeacherConflict } = useSchedule()
    const conflict = await checkTeacherConflict('张三', '周一', { start: '09:00', end: '11:00' })
    expect(conflict).toBeNull()
  })
})

describe('useSchedule — checkClassroomConflict', () => {
  beforeEach(() => {
    memoryStore.clear()
  })

  it('同一教室同一星期同一时段应检测到冲突', async () => {
    const existing = makeItem({
      id: 'existing-1',
      classroom: '101',
      weekday: '周一',
      slot: { start: '09:00', end: '11:00' },
    })
    await setScheduleData([existing])

    const { checkClassroomConflict } = useSchedule()
    const conflict = await checkClassroomConflict('101', '周一', { start: '09:00', end: '11:00' })
    expect(conflict).not.toBeNull()
  })

  it('不同教室不冲突', async () => {
    const existing = makeItem({
      id: 'existing-1',
      classroom: '101',
      weekday: '周一',
      slot: { start: '09:00', end: '11:00' },
    })
    await setScheduleData([existing])

    const { checkClassroomConflict } = useSchedule()
    const conflict = await checkClassroomConflict('102', '周一', { start: '09:00', end: '11:00' })
    expect(conflict).toBeNull()
  })

  it('空教室名不检测冲突', async () => {
    const { checkClassroomConflict } = useSchedule()
    const conflict = await checkClassroomConflict('', '周一', { start: '09:00', end: '11:00' })
    expect(conflict).toBeNull()
  })

  it('空教室名的排课项不触发教室冲突（教室未设置）', async () => {
    const existing = makeItem({
      id: 'existing-1',
      classroom: '',
      weekday: '周一',
      slot: { start: '09:00', end: '11:00' },
    })
    await setScheduleData([existing])

    const { checkClassroomConflict } = useSchedule()
    // 新排课教室也为空
    const conflict = await checkClassroomConflict('', '周一', { start: '09:00', end: '11:00' })
    expect(conflict).toBeNull()
  })
})

describe('useSchedule — migrateFromTimetable', () => {
  beforeEach(() => {
    memoryStore.clear()
  })

  it('空 schedule_v1 + 空 my_timetable → 迁移 0 条', async () => {
    const { migrateFromTimetable } = useSchedule()
    const result = await migrateFromTimetable()
    expect(result.migrated).toBe(0)
  })

  it('空 schedule_v1 + 有 my_timetable → 迁移成功', async () => {
    // 写入旧课表数据
    memoryStore.set('my_timetable', [
      {
        id: 'tt-1',
        weekday: '周一',
        slot: { start: '09:00', end: '11:00' },
        course: 'Python',
        lessonType: 'regular',
      },
      {
        id: 'tt-2',
        weekday: '周二',
        slot: { start: '14:00', end: '16:00' },
        course: 'C++',
        lessonType: 'retail',
      },
    ])
    // 写入默认教师名
    memoryStore.set('default_teacher_name_v1', '王老师')

    const { migrateFromTimetable, getScheduleList } = useSchedule()
    const result = await migrateFromTimetable()
    expect(result.migrated).toBe(2)

    const migrated = await getScheduleList()
    expect(migrated).toHaveLength(2)
    expect(migrated[0].teacher).toBe('王老师')
    expect(migrated[0].classroom).toBe('')
    expect(migrated[0].studentGroup).toEqual([])
    expect(migrated[0].weekday).toBe('周一')
    expect(migrated[0].course).toBe('Python')
  })

  it('已有 schedule_v1 数据时不迁移', async () => {
    await setScheduleData([makeItem({ id: 'existing-1' })])
    memoryStore.set('my_timetable', [
      { id: 'tt-1', weekday: '周一', slot: { start: '09:00', end: '11:00' }, course: 'Python' },
    ])

    const { migrateFromTimetable } = useSchedule()
    const result = await migrateFromTimetable()
    expect(result.migrated).toBe(0)
  })

  it('迁移后数据结构符合 ScheduleItem 定义', async () => {
    memoryStore.set('my_timetable', [
      { id: 'tt-1', weekday: '周三', slot: { start: '19:00', end: '21:00' }, course: 'Scratch' },
    ])
    memoryStore.set('default_teacher_name_v1', '李老师')

    const { migrateFromTimetable, getScheduleList } = useSchedule()
    await migrateFromTimetable()
    const items = await getScheduleList()

    expect(items).toHaveLength(1)
    const item = items[0]
    expect(item).toHaveProperty('id')
    expect(item).toHaveProperty('weekday', '周三')
    expect(item).toHaveProperty('slot')
    expect(item.slot).toHaveProperty('start', '19:00')
    expect(item.slot).toHaveProperty('end', '21:00')
    expect(item).toHaveProperty('course', 'Scratch')
    expect(item).toHaveProperty('teacher', '李老师')
    expect(item).toHaveProperty('classroom', '')
    expect(item).toHaveProperty('studentGroup')
    expect(item.studentGroup).toEqual([])
    expect(item).toHaveProperty('lessonType', 'regular')
    expect(item).toHaveProperty('updatedAt')
  })
})

describe('useSchedule — getTodayScheduleItems', () => {
  beforeEach(() => {
    memoryStore.clear()
  })

  it('应返回今日星期对应的排课项', async () => {
    const today = new Date().getDay()
    const todayWeekday = TIMETABLE_WEEKDAYS[(today + 6) % 7]
    const otherWeekday = TIMETABLE_WEEKDAYS[((today + 6) + 1) % 7]

    await setScheduleData([
      makeItem({ id: 'today-item', weekday: todayWeekday, course: 'Python' }),
      makeItem({ id: 'other-item', weekday: otherWeekday, course: 'C++' }),
    ])

    const { getTodayScheduleItems } = useSchedule()
    const items = await getTodayScheduleItems()
    expect(items).toHaveLength(1)
    expect(items[0].course).toBe('Python')
  })

  it('空数据返回空数组', async () => {
    const { getTodayScheduleItems } = useSchedule()
    const items = await getTodayScheduleItems()
    expect(items).toEqual([])
  })
})
