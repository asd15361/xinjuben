# PocketBase 共享架构迁移脚本

## 使用说明

1. 部署阿里云 PocketBase 后，访问 `http://your-ip:8090/_/` 创建管理员账号
2. 在管理界面手动执行以下迁移，或通过 pb_migrations 运行

---

## 一、全局共享表

### 1. users 表（加字段）

在默认 users 表添加字段：

```
registerSource: text (可选)
```

用途：记录用户首次注册的项目 appId。

---

### 2. user_apps 表（项目绑定）

新建 collection：

| 字段 | 类型 | 选项 |
|------|------|------|
| user | relation → users | required |
| appId | text | required |
| role | text | default: "member" |
| status | text | default: "active" |
| firstLoginAt | datetime | |
| lastLoginAt | datetime | |
| createdBy | text | |
| updatedBy | text | |

**索引**：
- 联合唯一索引：`user` + `appId`

**API Rules**：
- List/View: `@request.auth.id != ""`
- Create: `@request.auth.id != ""`
- Update: `@request.auth.id = user`

---

### 3. user_wallets 表（独立钱包）

新建 collection：

| 字段 | 类型 | 选项 |
|------|------|------|
| user | relation → users | required |
| appId | text | required |
| balance | number | default: 0 |

**索引**：
- 联合唯一索引：`user` + `appId`

**API Rules**：
- List/View: `@request.auth.id != "" && user = @request.auth.id`
- Create: 禁止公开（后台管理员创建）
- Update: 禁止公开（后台管理员更新）

---

## 二、xinjuben 项目业务表

### 1. xinjuben_projects

复制现有 `projects` 表结构，加前缀：

| 字段 | 类型 |
|------|------|
| user | relation → users |
| storyIntentJson | json |
| entityStoreJson | json |
| generationStatusJson | json |
| marketProfileJson | json |
| marketPlaybookSelectionJson | json |
| projectVersion | number |
| ... | (其他字段同原表) |

**API Rules**：
- List: `@request.auth.id != "" && user = @request.auth.id`
- View: `@request.auth.id != "" && user = @request.auth.id`
- Create: `@request.auth.id != ""`
- Update/Delete: `@request.auth.id != "" && user = @request.auth.id`

---

### 2. xinjuben_project_chats

复制 `project_chats`，字段不变，API Rules 同上。

---

### 3. xinjuben_project_outlines

复制 `project_outlines`，字段不变。

---

### 4. xinjuben_project_characters

复制 `project_characters`，字段不变。

---

### 5. xinjuben_project_detailed_outlines

复制 `project_detailed_outlines`，字段不变。

---

### 6. xinjuben_project_scripts

复制 `project_scripts`，字段不变。

---

### 7. xinjuben_transactions（积分流水）

新建：

| 字段 | 类型 |
|------|------|
| user | relation → users |
| type | text |
| amount | number |
| balanceBefore | number |
| balanceAfter | number |
| description | text |
| metadata | json |

**API Rules**：
- List/View: `@request.auth.id != "" && user = @request.auth.id`
- Create/Update/Delete: 禁止公开（后台）

---

## 三、环境变量配置

部署后修改 `server/.env`：

```env
POCKETBASE_URL=https://your-pocketbase-domain.com
PB_ADMIN_EMAIL=admin@example.com
PB_ADMIN_PASSWORD=your-admin-password
APP_ID=xinjuben
```

---

## 四、数据迁移步骤

1. 导出本地 PocketBase 数据（JSON）
2. 导入到阿里云新表（修改 user ID 关系）
3. 清理本地旧数据

---

## 五、验证清单

- [ ] users 表有 registerSource 字段
- [ ] user_apps 表有 user+appId 唯一索引
- [ ] user_wallets 表有 user+appId 唯一索引
- [ ] xinjuben_xxx 表有 API Rules
- [ ] 服务端 .env 配置正确地址