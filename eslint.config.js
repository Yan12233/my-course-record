import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettierConfig from 'eslint-config-prettier'

export default [
  // 基础推荐
  js.configs.recommended,

  // Vue 3 推荐规则
  ...pluginVue.configs['flat/recommended'],

  // Prettier 兼容（关掉与 Prettier 冲突的规则）
  prettierConfig,

  // 项目自定义规则
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      // ---- 代码质量 ----
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'warn',
      'no-var': 'error',

      // ---- Vue 特定 ----
      'vue/multi-word-component-names': 'off',         // 允许单名单文件组件
      'vue/require-default-prop': 'off',               // Composition API 下不强制
      'vue/no-v-html': 'warn',                         // v-html 有 XSS 风险

      // ---- 风格（由 Prettier 处理，这里只设级别） ----
      'vue/html-self-closing': ['warn', {
        html: { void: 'always', normal: 'never' },
      }],
      'vue/component-tags-order': ['warn', {
        order: ['script', 'template', 'style'],
      }],
    },
  },

  // 忽略构建产物
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.config.js',       // vite/tailwind/postcss 配置
      'netlify/functions/**',
    ],
  },
]
