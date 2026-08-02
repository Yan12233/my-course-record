/**
 * useResource 筛选 + 搜索 + CRUD 逻辑测试
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useResource } from '../src/composables/useResource'
import { memoryStore } from './setup'

/** 构造资源项（默认值不含搜索关键词，避免干扰测试） */
function makeResource(overrides) {
  return {
    id: overrides.id || 'res-1',
    title: overrides.title || '默认教案',
    subject: overrides.subject || '默认学科',
    grade: overrides.grade || '五年级',
    type: overrides.type || 'lesson_plan',
    url: overrides.url || 'https://kdocs.cn/xxx',
    description: overrides.description || '默认备注',
    tags: overrides.tags || [],
    createdAt: overrides.createdAt || Date.now(),
    updatedAt: overrides.updatedAt || Date.now(),
  }
}

/** 写入资源数据 */
function setResourceData(items) {
  memoryStore.set('resource_index_v1', items)
}

describe('useResource — filterResources', () => {
  beforeEach(() => {
    memoryStore.clear()
  })

  it('按学科筛选', async () => {
    setResourceData([
      makeResource({ id: 'r1', subject: 'Python', title: '教案1' }),
      makeResource({ id: 'r2', subject: 'C++', title: '教案2' }),
      makeResource({ id: 'r3', subject: 'Python', title: '教案3' }),
    ])

    const { filterResources } = useResource()
    const result = await filterResources({ subject: 'Python' })
    expect(result).toHaveLength(2)
    expect(result.every(r => r.subject === 'Python')).toBe(true)
  })

  it('按年级筛选', async () => {
    setResourceData([
      makeResource({ id: 'r1', grade: '五年级' }),
      makeResource({ id: 'r2', grade: '初一' }),
    ])

    const { filterResources } = useResource()
    const result = await filterResources({ grade: '初一' })
    expect(result).toHaveLength(1)
    expect(result[0].grade).toBe('初一')
  })

  it('按类型筛选', async () => {
    setResourceData([
      makeResource({ id: 'r1', type: 'lesson_plan' }),
      makeResource({ id: 'r2', type: 'courseware' }),
      makeResource({ id: 'r3', type: 'exercise' }),
    ])

    const { filterResources } = useResource()
    const result = await filterResources({ type: 'courseware' })
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('courseware')
  })

  it('组合筛选（学科+年级+类型）', async () => {
    setResourceData([
      makeResource({ id: 'r1', subject: 'Python', grade: '五年级', type: 'lesson_plan' }),
      makeResource({ id: 'r2', subject: 'Python', grade: '五年级', type: 'courseware' }),
      makeResource({ id: 'r3', subject: 'C++', grade: '五年级', type: 'lesson_plan' }),
      makeResource({ id: 'r4', subject: 'Python', grade: '初一', type: 'lesson_plan' }),
    ])

    const { filterResources } = useResource()
    const result = await filterResources({ subject: 'Python', grade: '五年级', type: 'lesson_plan' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('r1')
  })

  it('空筛选条件返回全部', async () => {
    setResourceData([
      makeResource({ id: 'r1' }),
      makeResource({ id: 'r2' }),
    ])

    const { filterResources } = useResource()
    const result = await filterResources({})
    expect(result).toHaveLength(2)
  })

  it('空数据返回空数组', async () => {
    const { filterResources } = useResource()
    const result = await filterResources({ subject: 'Python' })
    expect(result).toEqual([])
  })
})

describe('useResource — searchResources', () => {
  beforeEach(() => {
    memoryStore.clear()
  })

  it('按标题模糊搜索（大小写不敏感）', async () => {
    setResourceData([
      makeResource({ id: 'r1', title: 'Python循环结构教案', subject: '编程', description: '教学设计' }),
      makeResource({ id: 'r2', title: 'C++数组课件', subject: '编程', description: '数组练习' }),
      makeResource({ id: 'r3', title: 'python入门指南', subject: '编程', description: '入门教程' }),
    ])

    const { searchResources } = useResource()
    const result = await searchResources('python')
    expect(result).toHaveLength(2) // 'Python循环结构教案' 和 'python入门指南'
  })

  it('按备注模糊搜索', async () => {
    setResourceData([
      makeResource({ id: 'r1', title: '教案1', subject: '编程', description: '包含循环和条件判断' }),
      makeResource({ id: 'r2', title: '教案2', subject: '编程', description: '数组操作练习' }),
    ])

    const { searchResources } = useResource()
    const result = await searchResources('循环')
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('教案1')
  })

  it('按学科搜索', async () => {
    setResourceData([
      makeResource({ id: 'r1', subject: 'Python', title: '教案A', description: '备注A' }),
      makeResource({ id: 'r2', subject: 'C++', title: '教案B', description: '备注B' }),
    ])

    const { searchResources } = useResource()
    const result = await searchResources('python')
    expect(result).toHaveLength(1)
    expect(result[0].subject).toBe('Python')
  })

  it('空关键词返回全部资源', async () => {
    setResourceData([
      makeResource({ id: 'r1' }),
      makeResource({ id: 'r2' }),
    ])

    const { searchResources } = useResource()
    const result = await searchResources('')
    expect(result).toHaveLength(2)
  })

  it('无匹配结果返回空数组', async () => {
    setResourceData([
      makeResource({ id: 'r1', title: 'Python教案' }),
    ])

    const { searchResources } = useResource()
    const result = await searchResources('Java')
    expect(result).toEqual([])
  })

  it('空格关键词视为空搜索', async () => {
    setResourceData([
      makeResource({ id: 'r1' }),
      makeResource({ id: 'r2' }),
    ])

    const { searchResources } = useResource()
    const result = await searchResources('   ')
    expect(result).toHaveLength(2)
  })
})

describe('useResource — saveResource', () => {
  beforeEach(() => {
    memoryStore.clear()
  })

  it('新增资源', async () => {
    const { saveResource, getResourceList } = useResource()
    const newResource = makeResource({ id: 'r1', title: '新教案' })

    await saveResource(newResource)
    const list = await getResourceList()
    expect(list).toHaveLength(1)
    expect(list[0].title).toBe('新教案')
  })

  it('更新已有资源', async () => {
    setResourceData([
      makeResource({ id: 'r1', title: '旧标题' }),
    ])

    const { saveResource, getResourceList } = useResource()
    await saveResource({ id: 'r1', title: '新标题', subject: 'Python', grade: '五年级', type: 'lesson_plan' })

    const list = await getResourceList()
    expect(list).toHaveLength(1)
    expect(list[0].title).toBe('新标题')
  })

  it('无标题的资源被拒绝（sanitize 返回 null）', async () => {
    const { saveResource } = useResource()
    await expect(saveResource({ id: 'r1', title: '' })).rejects.toThrow('资源数据无效')
  })
})

describe('useResource — deleteResource', () => {
  beforeEach(() => {
    memoryStore.clear()
  })

  it('删除资源', async () => {
    setResourceData([
      makeResource({ id: 'r1' }),
      makeResource({ id: 'r2' }),
    ])

    const { deleteResource, getResourceList } = useResource()
    await deleteResource('r1')
    const list = await getResourceList()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('r2')
  })

  it('删除不存在的 ID 不报错', async () => {
    setResourceData([makeResource({ id: 'r1' })])

    const { deleteResource, getResourceList } = useResource()
    await deleteResource('nonexistent')
    const list = await getResourceList()
    expect(list).toHaveLength(1)
  })
})
