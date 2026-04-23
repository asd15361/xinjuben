import { defineConfig } from 'eslint/config'
import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh'

// 质量门边界收口：只扫描现役正式代码
// 排除目录及原因：
// - .codex/ - Codex 临时测试文件
// - archive/ - 历史归档代码
// - docs/归档/ - 历史文档
// - scripts/archive/ - 历史脚本
// - graphify-out/ - 知识图谱缓存输出
// - server/pb_data/types.d.ts - PocketBase 自动生成类型
// - **/*.tsbuildinfo - TypeScript 增量编译缓存
// - tools/e2e/out/ - E2E 测试输出目录
// - tools/e2e/observation/ - 观察脚本（一次性分析用）
// - tools/e2e/analysis/ - 分析脚本（一次性分析用）
// - tools/e2e/prototype/ - 原型测试脚本
// - tools/e2e/seed-constructors/ - 测试种子构造器
// - tools/e2e/seeds/ - 测试种子数据
// - tools/e2e/runners/observation/ - 观察运行器
// - tools/e2e/runners/official/ - 官方运行器（一次性测试脚本，不纳入主链质量门）
// - tools/e2e/tests/ - E2E 测试脚本
// - tools/e2e/utils/ - E2E 工具函数
// - tools/tests/ - 临时测试文件
// - server/pb_migrations/ - PocketBase 迁移（自动生成）
// - server/pb_hooks/ - PocketBase 钩子（JS，非主链）
// - server/scripts/ - 服务器脚本（临时工具）
// - server/test-*.cjs - 临时测试脚本
// - server/test-*.log - 测试日志
// - server/test-evidence/ - 测试证据目录
// - scripts/analyze-lint*.js - 本脚本自身（临时分析工具）
export default defineConfig(
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/out',
      '.codex/**',
      'archive/**',
      'docs/归档/**',
      'docs/archive/**',
      'scripts/archive/**',
      'graphify-out/**',
      'server/pb_data/types.d.ts',
      '**/*.tsbuildinfo',
      'tools/e2e/out/**',
      'tools/e2e/observation/**',
      'tools/e2e/analysis/**',
      'tools/e2e/prototype/**',
      'tools/e2e/seed-constructors/**',
      'tools/e2e/seeds/**',
      'tools/e2e/runners/observation/**',
      'tools/e2e/runners/official/**',
      'tools/e2e/tests/**',
      'tools/e2e/utils/**',
      'tools/tests/**',
      'server/pb_migrations/**',
      'server/pb_hooks/**',
      'server/scripts/**',
      'server/test-*.cjs',
      'server/test-*.log',
      'server/test-evidence/**',
      'scripts/analyze-lint*.js',
      'scripts/authority-gate.js',
      'fix-escapes.js'
    ]
  },
  tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat['jsx-runtime'],
  {
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': eslintPluginReactHooks,
      'react-refresh': eslintPluginReactRefresh
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginReactRefresh.configs.vite.rules
    }
  },
  eslintConfigPrettier,
  {
    files: ['src/renderer/src/app/hooks/useScriptProjectRuntime.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off'
    }
  },
  {
    files: ['src/renderer/src/features/seven-questions/ui/SevenQuestionsReviewPanel.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/set-state-in-effect': 'off'
    }
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    files: ['**/*.test.ts', '**/*.test.mjs'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off'
    }
  }
)
