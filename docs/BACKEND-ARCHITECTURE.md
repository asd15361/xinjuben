# Xinjuben 前后端分离架构文档

## 项目概述

Xinjuben（心剧本）是一个 AI 驱动的剧本创作工具，原为 Electron 单体应用，现改造为前后端分离架构，支持商业化运营。

**商业模式：** 用户注册送 100 积分 → 每次 AI 调用扣 1 积分 → 积分不足充值

---

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户端                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Electron    │    │ Web 浏览器  │    │ 管理后台    │         │
│  │ 桌面客户端  │    │ (未来)      │    │ (未来)      │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │ HTTP/REST API    │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Node.js 后端服务                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Express API Server (port 3001)                              ││
│  │  /api/auth/*      - 用户认证                                ││
│  │  /api/credits/*   - 积分管理                                ││
│  │  /api/generate/*  - AI 生成                                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│  ┌───────────────┐  ┌────────┴────────┐  ┌───────────────────┐  │
│  │ Agent 服务层  │  │ AI 通道路由     │  │ 业务服务层        │  │
│  │ seven-questions│  │ DeepSeek       │  │ CreditService    │  │
│  │ outline       │  │ OpenRouter     │  │ PaymentService   │  │
│  │ character     │  │ (多通道fallback)│  │                  │  │
│  └───────────────┘  └─────────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       数据层                                     │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ PocketBase      │    │ DeepSeek API    │                     │
│  │ (SQLite)        │    │ (LLM 服务)      │                     │
│  │                 │    │                 │                     │
│  │ - users         │    │ - deepseek-chat │                     │
│  │ - credits       │    └─────────────────┘                     │
│  │ - transactions  │                                            │
│  │ - api_call_logs │                                            │
│  │ - payment_orders│                                            │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 目录结构

```
xinjuben/
├── client/                      # Electron 桌面客户端（原 src/）
│   ├── main/                    # Electron 主进程（精简版）
│   ├── preload/                 # Preload API（IPC → HTTP）
│   ├── renderer/                # React 前端
│   └── shared/contracts/        # 共享类型定义
│
├── server/                      # Node.js 后端服务（新建）
│   ├── src/
│   │   ├── api/                 # HTTP API 层
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts      # 认证路由
│   │   │   │   ├── credits.ts   # 积分路由
│   │   │   │   └── generate.ts  # 生成路由
│   │   │   └── middleware/
│   │   │       └── auth.ts      # JWT 认证中间件
│   │   │
│   │   ├── application/         # Agent 业务逻辑
│   │   │   ├── ai/
│   │   │   │   └── generate-text.ts  # AI 多通道调用
│   │   │   └── workspace/
│   │   │       └── seven-questions-agent.ts  # 七问 Agent
│   │   │
│   │   ├── services/            # 业务服务
│   │   │   └── credit-service.ts  # 积分管理
│   │   │
│   │   ├── infrastructure/      # 基础设施
│   │   │   ├── pocketbase/
│   │   │   │   └── client.ts    # PocketBase 客户端
│   │   │   └── runtime-env/
│   │   │       └── provider-config.ts  # AI 配置
│   │   │
│   │   └── index.ts             # 服务入口
│   │
│   ├── scripts/                 # 工具脚本
│   │   └── init-pocketbase.ts   # 数据库初始化
│   │
│   ├── .env                     # 环境变量
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                      # 共享类型定义（未来提取）
│
├── docs/                        # 文档
│   └── FRONTEND-MIGRATION-GUIDE.md  # 前端改造指南
│
└── pocketbase.exe               # PocketBase 可执行文件
```

---

## API 接口文档

### 认证接口

#### 注册
```
POST /api/auth/register

Request:
{
  "email": "user@example.com",
  "password": "password123",
  "passwordConfirm": "password123",
  "name": "用户名"
}

Response:
{
  "user": { "id": "xxx", "email": "user@example.com", "name": "用户名" },
  "token": "eyJhbG...",
  "credits": { "balance": 100 }
}

说明: 注册成功自动送 100 积分
```

#### 登录
```
POST /api/auth/login

Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "user": { "id": "xxx", "email": "user@example.com" },
  "token": "eyJhbG...",
  "credits": { "balance": 99 }
}
```

#### 获取用户信息
```
GET /api/auth/me
Header: Authorization: Bearer <token>

Response:
{
  "user": { "id": "xxx", "email": "user@example.com", "name": "用户名" },
  "credits": { "balance": 99, "frozenBalance": 0 }
}
```

---

### 积分接口

#### 查询余额
```
GET /api/credits/balance
Header: Authorization: Bearer <token>

Response:
{
  "balance": 99,
  "frozenBalance": 0
}
```

#### 查询交易记录
```
GET /api/credits/transactions
Header: Authorization: Bearer <token>

Response:
{
  "transactions": [
    {
      "id": "xxx",
      "type": "register_bonus",
      "amount": 100,
      "balanceBefore": 0,
      "balanceAfter": 100,
      "description": "新用户注册奖励",
      "createdAt": "2026-04-16T..."
    },
    {
      "id": "yyy",
      "type": "api_call",
      "amount": -1,
      "balanceBefore": 100,
      "balanceAfter": 99,
      "description": "AI调用: seven_questions",
      "createdAt": "2026-04-16T..."
    }
  ],
  "total": 2
}
```

---

### 生成接口

#### 生成七问
```
POST /api/generate/seven-questions
Header: Authorization: Bearer <token>

Request:
{
  "storyIntent": {
    "titleHint": "都市逆袭剧",
    "genre": "都市",
    "tone": "爽文",
    "protagonist": "林风",
    "antagonist": "赵家大少",
    "coreConflict": "底层青年逆袭豪门",
    "endingDirection": "主角成功逆袭"
  },
  "totalEpisodes": 10
}

Response:
{
  "success": true,
  "sevenQuestions": {
    "needsSections": false,
    "sectionCount": 1,
    "sections": [...]
  },
  "lane": "deepseek",
  "model": "deepseek-chat",
  "durationMs": 16057,
  "creditsRemaining": 98
}

错误码:
- 401: 未登录或 token 过期
- 402: 积分不足
- 500: AI 服务未配置或生成失败
```

#### 通用文本生成
```
POST /api/generate
Header: Authorization: Bearer <token>

Request:
{
  "task": "general",
  "prompt": "请生成...",
  "temperature": 0.7,
  "maxOutputTokens": 2000
}

Response:
{
  "success": true,
  "text": "生成的内容...",
  "lane": "deepseek",
  "model": "deepseek-chat",
  "durationMs": 5000,
  "creditsRemaining": 97
}
```

---

## 数据库表结构

### users（用户表 - PocketBase 内置）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 |
| email | email | 邮箱（唯一） |
| name | text | 用户名 |
| created | datetime | 创建时间 |
| updated | datetime | 更新时间 |

### credits（积分余额表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 |
| user | relation | 关联用户 |
| balance | number | 可用余额 |
| frozenBalance | number | 冻结余额 |
| created | datetime | 创建时间 |
| updated | datetime | 更新时间 |

### transactions（交易记录表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 |
| user | relation | 关联用户 |
| type | select | 类型：register_bonus / api_call / payment / refund / admin_adjust |
| amount | number | 金额（正=加，负=减） |
| balanceBefore | number | 操作前余额 |
| balanceAfter | number | 操作后余额 |
| description | text | 描述 |
| created | datetime | 创建时间 |

### api_call_logs（API 调用日志表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 |
| user | relation | 关联用户 |
| task | text | 任务类型 |
| lane | text | AI 通道 |
| model | text | 模型名 |
| costCredits | number | 消耗积分 |
| durationMs | number | 耗时 |
| success | bool | 是否成功 |
| errorMessage | text | 错误信息 |
| created | datetime | 创建时间 |

### payment_orders（支付订单表 - 第三步使用）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 |
| user | relation | 关联用户 |
| amount | number | 充值金额（元） |
| credits | number | 获得积分 |
| status | select | pending / paid / failed / refunded |
| alipayTradeNo | text | 支付宝交易号 |
| created | datetime | 创建时间 |

---

## 环境变量配置

### server/.env

```bash
# PocketBase 配置
POCKETBASE_URL=http://localhost:8090
PB_ADMIN_EMAIL=your_admin@example.com
PB_ADMIN_PASSWORD=your_password

# 服务器配置
PORT=3001
NODE_ENV=development

# AI Provider 配置
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_TIMEOUT_MS=45000

OPENROUTER_API_KEY=         # 可选
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# 启用的通道
MODEL_ROUTER_ENABLE_DEEPSEEK=1
MODEL_ROUTER_ENABLE_OPENROUTER_GEMINI_FLASH_LITE=0
MODEL_ROUTER_ENABLE_OPENROUTER_QWEN_FREE=0
```

---

## 快速启动指南

### 1. 启动 PocketBase

```bash
cd server
./pocketbase.exe serve --http=127.0.0.1:8090
```

访问 http://localhost:8090/_/ 创建管理员账号

### 2. 初始化数据库

```bash
cd server
# 编辑 .env 填入管理员账号
npx tsx scripts/init-pocketbase.ts
```

### 3. 启动后端服务

```bash
cd server
npx tsx src/index.ts
```

### 4. 测试接口

```bash
# 注册
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","passwordConfirm":"test123"}'

# 登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 查询积分
curl http://localhost:3001/api/credits/balance \
  -H "Authorization: Bearer <token>"

# 生成七问
curl -X POST http://localhost:3001/api/generate/seven-questions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"storyIntent":{"titleHint":"测试剧"},"totalEpisodes":10}'
```

---

## 迁移进度

| 步骤 | 状态 | 说明 |
|------|------|------|
| 第一步：打基建 | ✅ 完成 | PocketBase + 用户 + 积分 |
| 第二步：搬家 | ✅ 完成 | 七问 Agent 迁移到后端 |
| 第三步：支付宝 | 📝 待开发 | 支付集成 |
| 第四步：管理后台 | 📝 待开发 | Admin Panel |
| 前端改造 | 📝 待开发 | Electron 客户端对接 |

---

## 相关文档

- [前端改造指南](./FRONTEND-MIGRATION-GUIDE.md)
- [API 接口文档](#api-接口文档)
- [数据库表结构](#数据库表结构)