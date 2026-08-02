# 🔬 my-course-record-h5 技术评估与团队能力提升方案

> 评估人：Senior Developer（高级开发工程师）  
> 评估日期：2026-07-31  
> 项目阶段：阶段一 · 工具打磨（Vue 3 PWA 纯前端）

---

## 一、项目概览

| 维度 | 当前状态 |
|------|----------|
| **技术栈** | Vue 3 (Composition API) + Vite + TailwindCSS |
| **存储** | localforage (IndexedDB) |
| **离线能力** | PWA (vite-plugin-pwa + Workbox) |
| **导出** | ExcelJS + JSZip + file-saver |
| **图表** | Chart.js |
| **云同步** | WebDAV via Netlify Functions 代理 |
| **部署** | Netlify |
| **代码行数估算** | ~6000+ 行 Vue/JS |
| **组件数量** | 25 个 .vue 组件 |

---

## 二、代码质量深度评估

### 📊 评分总览

| 评估维度 | 分数 (1-10) | 等级 |
|----------|:----------:|------|
| 架构设计 | 5 | ⚠️ 需改进 |
| 组件设计 | 5 | ⚠️ 需改进 |
| 数据管理 | 6 | 可接受 |
| 错误处理 | 4 | ❌ 薄弱 |
| 代码规范性 | 5 | ⚠️ 需改进 |
| 性能优化 | 6 | 可接受 |
| 安全性 | 5 | ⚠️ 需改进 |
| 可测试性 | 2 | ❌ 严重不足 |
| 工具链与工程化 | 4 | ❌ 薄弱 |
| 文档 | 5 | 可接受 |

**综合评分：4.7 / 10 — 需要系统性提升**

---

### 2.1 🔴 严重问题 (P0 — 必须立即修复)

#### 问题 1：App.vue 「上帝组件」

`src/App.vue` 的 `<script setup>` 部分约 **1517 行**，承载了：
- 应用级路由状态管理
- 所有表单数据的响应式状态
- 表单验证逻辑
- 记录 CRUD 操作
- 导出/分享/备份逻辑
- 课表管理
- Toast 通知
- 时钟显示
- 草稿自动保存
- 云同步状态管理
- ……

**影响**：单一组件承载过多职责，导致：
- 新人理解代码耗时巨大
- 修改一个功能容易影响其他功能
- 无法进行单元测试
- 重构风险极高

**修复方案**：将「视图路由」改为 Vue Router，将「全局状态」抽到 Pinia store。

```js
// 推荐的架构演进
src/
  stores/
    recordStore.js      // 记录数据、CRUD
    formStore.js        // 表单状态、校验、草稿
    uiStore.js          // 视图切换、Toast、加载状态
    syncStore.js        // 云同步状态
  views/
    CalendarView.vue    // 日历首页
    DayView.vue         // 日视图
    LessonEditor.vue    // 上课录入
    DashboardView.vue   // 数据看板
  App.vue               // 仅保留路由和顶层布局 (~50行)
```

#### 问题 2：零测试覆盖

整个项目没有任何测试文件：
- 无 `.test.js` / `.spec.js` 文件
- 无 Vitest/Jest 配置
- 无 E2E 测试

**影响**：每次修改都是盲改，回归测试只能手工完成，发版如走钢丝。

**修复方案**：引入 Vitest + Vue Test Utils，优先覆盖核心数据逻辑。

```bash
# 立即安装
npm install -D vitest @vue/test-utils jsdom
```

```js
// 优先编写的测试：工具函数 + Composables
// tests/utils/lessonDate.test.js
import { describe, it, expect } from 'vitest';
import { getRecordIsoDate, recordBelongsToMonth } from '@/utils/lessonDate';

describe('lessonDate', () => {
  it('getRecordIsoDate returns correct date', () => {
    const record = { lessonDate: '2026-07-31' };
    expect(getRecordIsoDate(record)).toBe('2026-07-31');
  });
  
  it('recordBelongsToMonth filters correctly', () => {
    const record = { lessonDate: '2026-07-31' };
    expect(recordBelongsToMonth(record, '2026-07')).toBe(true);
  });
});
```

#### 问题 3：全局错误处理缺失

项目中所有 `catch` 仅做 `console.error` 或 Toast 提示，没有：
- 全局错误边界 (Error Boundary)
- 未捕获 Promise 拒绝处理
- 错误上报机制
- 用户友好的错误恢复引导

**修复方案**：

```js
// src/utils/errorHandler.js
export function setupGlobalErrorHandler(app) {
  app.config.errorHandler = (err, instance, info) => {
    console.error('[Global Error]', err, info);
    // 上报到错误追踪服务
    // reportError(err, { component: instance?.$options?.name, info });
  };
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise]', event.reason);
    // reportError(event.reason);
  });
}
```

---

### 2.2 🟡 需要改进的问题 (P1 — 近期修复)

#### 问题 4：useDatabase.js 职责过重

`src/composables/useDatabase.js` 有 **759 行**，混合了：
- 存储配置
- 时间解析工具函数
- 记录 CRUD
- 学生管理
- 课表管理
- 草稿管理
- 积分表配置
- 课程模板管理
- 课程分类管理

**修复方案**：按领域拆分：

```
src/
  stores/            (Pinia stores, 替代 composable 中的状态)
  services/
    storage.js       (localforage 配置与基础操作)
    recordService.js (记录 CRUD)
    timetableService.js (课表)
    templateService.js  (课程模板)
    pointsService.js    (积分表)
```

#### 问题 5：无 TypeScript

项目中所有的 Props、Events、数据结构都是隐式的，导致：
- IDE 智能提示不足
- 重构时容易遗漏字段
- 新人需要阅读大量代码才能理解数据结构

**修复方案**：渐进式引入 TypeScript。

```ts
// src/types/record.ts — 类型定义先行
export interface Student {
  name: string;
  hwDone: number;
  hwTotal: number;
  cwDone: number;
  cwTotal: number;
  feedback: string;
}

export interface LessonRecord {
  id: string;
  datetime: string;
  course: string;
  lessonSchedule: string;
  lessonDate: string;
  subject: string;
  teacher: string;
  classTime: string;
  classTimeSlot: { start: string; end: string } | null;
  admin: string;
  courseContent: string;
  students: Student[];
  lessonType: 'regular' | 'retail';
  classHours: number;
  headCount: number;
  feeRate: number;
  classFee: number;
  advancedFeedbackEnabled: boolean;
  imageBase64: string | null;
  imageFileName: string | null;
  imageMimeType: string | null;
  createdAt: number;
}
```

#### 问题 6：无代码规范工具

缺少 ESLint + Prettier 配置，代码风格不一致：
- 有的地方用 `for` 循环，有的用 `forEach`
- 变量命名不统一（`studentsDraft` vs `newStudentName`）
- 注释风格各异

**修复方案**：

```bash
npm install -D eslint @eslint/js eslint-plugin-vue prettier eslint-config-prettier
```

```js
// eslint.config.js
import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-console': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
```

---

### 2.3 🟢 可优化项 (P2 — 逐步改善)

#### 问题 7：图片压缩策略

当前 `useImageHandler` 中的 `compressImageFileForStorage` 将图片直接存为 Base64 到 IndexedDB，长期使用会显著增大存储体积。

**优化方案**：
- 限制图片最大尺寸（当前无限制）
- 考虑使用 IndexedDB 的 Blob 存储代替 Base64
- 或在同步时将图片上传到专用存储

#### 问题 8：组件拆分可进一步细化

虽然已将 Modal 等拆分为独立组件，但 `DayLessonsView` 和 `LessonEditorView` 可能仍有较多内嵌逻辑。

#### 问题 9：TailwindCSS 配置过于基础

`tailwind.config.js` 只扩展了字体，没有自定义主题色、间距、动画等，导致大量硬编码颜色值散布在模板中。

```js
// 推荐扩展
theme: {
  extend: {
    colors: {
      brand: {
        50: '#eef2ff',
        500: '#4f46e5',
        700: '#4338ca',
      },
    },
    animation: {
      'slide-up': 'slideUp 0.3s ease-out',
      'fade-in': 'fadeIn 0.2s ease-out',
    },
  },
}
```

---

## 三、团队技术能力提升路线图

### 🎯 第一阶段：夯实基础（1-2 周）

| 序号 | 行动项 | 优先级 | 预期收益 |
|:----:|--------|:------:|----------|
| 1 | 安装 ESLint + Prettier，统一代码风格 | P0 | 代码质量一致性 |
| 2 | 编写 5 个核心工具函数单元测试 | P0 | 建立测试文化 |
| 3 | 添加全局错误处理 | P0 | 用户体验 |
| 4 | 创建 `src/types/` 类型定义文件 | P1 | 代码可读性 |
| 5 | 补充 README 开发指南 | P1 | 新人上手 |

### 🎯 第二阶段：架构升级（2-4 周）

| 序号 | 行动项 | 优先级 | 预期收益 |
|:----:|--------|:------:|----------|
| 1 | 引入 Pinia，拆分 recordStore / formStore | P0 | 架构清晰度 |
| 2 | 引入 Vue Router，消除手动视图切换 | P0 | 路由管理 |
| 3 | 按领域拆分 useDatabase.js | P1 | 模块内聚 |
| 4 | 添加 Vitest + Vue Test Utils | P0 | 测试覆盖 |
| 5 | 集成 Husky + lint-staged（预提交检查） | P1 | 代码门禁 |

### 🎯 第三阶段：工程化提升（1-2 月）

| 序号 | 行动项 | 优先级 | 预期收益 |
|:----:|--------|:------:|----------|
| 1 | 渐进式迁移核心模块到 TypeScript | P1 | 类型安全 |
| 2 | 配置 CI/CD（GitHub Actions 自动化测试+部署） | P1 | 发布质量 |
| 3 | 引入 Storybook 组件文档 | P2 | 组件复用 |
| 4 | 性能监控（Lighthouse CI） | P2 | 性能保障 |
| 5 | 错误监控（Sentry 或自建） | P2 | 线上稳定性 |

---

## 四、推荐的改进目录结构

```
my-course-record-h5/
├── src/
│   ├── assets/              # 静态资源
│   ├── components/          # 通用 UI 组件
│   │   ├── ui/              # 基础组件 (Button, Input, Modal...)
│   │   └── business/        # 业务组件
│   ├── composables/         # 可复用逻辑 (纯逻辑，无状态)
│   ├── services/            # 数据服务层 (替代 useDatabase.js)
│   │   ├── storage.js
│   │   ├── recordService.js
│   │   ├── timetableService.js
│   │   └── syncService.js
│   ├── stores/              # Pinia 状态管理
│   │   ├── recordStore.js
│   │   ├── formStore.js
│   │   └── uiStore.js
│   ├── types/               # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/               # 纯工具函数 ✅ 已有
│   │   ├── lessonDate.js
│   │   └── lessonFee.js
│   ├── views/               # 页面级组件
│   │   ├── CalendarView.vue
│   │   ├── DayView.vue
│   │   └── DashboardView.vue
│   ├── App.vue              # 精简后的根组件
│   ├── main.js
│   └── style.css
├── tests/                   # 测试目录
│   ├── unit/
│   │   ├── utils/
│   │   ├── services/
│   │   └── stores/
│   └── e2e/
├── .github/workflows/       # CI/CD
├── eslint.config.js
├── .prettierrc
├── vitest.config.js
├── tsconfig.json
└── package.json
```

---

## 五、代码审查中的亮点 ✨

在指出问题的同时，也要肯定团队做得好的地方：

1. **Composition API 使用得当** — 团队已采用 Vue 3 推荐模式
2. **数据清洗意识强** — `sanitizeRecord`、`sanitizeStudent` 等函数体现了良好的防御性编程
3. **离线优先架构** — PWA + IndexedDB 设计合理，适合教学场景
4. **WebDAV 同步方案务实** — 通过 Netlify Function 代理规避 CORS 问题，设计用心
5. **时间解析函数健壮** — `parseTimeString` 支持多种分隔符和中文格式
6. **Excel 导出质量高** — 积分表导出逻辑详尽，格式化处理到位
7. **草稿自动保存** — 800ms 防抖保存草稿，用户体验考虑周到
8. **ROADMAP.md 清晰** — 产品规划文档质量高

---

## 六、建议的学习路径（按角色）

### 前端开发者
1. Vue 3 深入：Composition API、Pinia、Vue Router
2. TypeScript 基础 → Vue + TS 实战
3. 测试驱动开发：Vitest + Vue Test Utils
4. 性能优化：Lighthouse、Bundle Analysis

### 全栈开发者
1. Node.js 后端基础（Express/Fastify）
2. 数据库设计（SQLite/PostgreSQL）
3. API 设计规范（RESTful）
4. 部署与运维（Docker、CI/CD）

### 学习资源推荐
- 《Vue.js 设计与实现》（霍春阳）
- Vue 官方文档 + 风格指南
- Frontend Masters / Udemy 实战课程
- GitHub 优质开源项目阅读

---

## 七、总结

当前项目**功能完整、业务价值明确**，但**工程化水平有较大提升空间**。核心矛盾是：业务逻辑集中在一个巨大组件中，缺少测试和类型系统作为安全网。

建议团队按「第一阶段→第二阶段→第三阶段」的节奏推进，先建立代码规范和测试文化，再进行架构重构，最后引入工程化体系。每一步都保证项目**持续可运行、可发布**，不给用户造成中断。

---

> 💎 **核心理念**：好的代码不仅要能跑，还要能让接手的人快速理解、自信修改、放心发布。
