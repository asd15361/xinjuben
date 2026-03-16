# xinjuben

AI 剧本创作赋能引擎的重建仓库。

当前目标不是继续堆原型，而是先搭出一套可维护、可扩展的桌面创作架构，再逐步把旧项目里真正能提升剧本质量的业务逻辑迁进来。

## 当前骨架

- `src/shared`：跨层 contract 和纯规则层
- `src/main`：Electron 主进程、运行时能力、受控 IPC、AI 执行入口
- `src/preload`：白名单 API
- `src/renderer`：四工序 UI 和工作台

当前已经落地的关键骨架：

- 项目真相中心：项目、故事意图、粗纲草稿
- 受控 AI 入口：模型调用只允许走 `main`
- 阶段合同骨架：粗纲 / 人物 / 详纲 / 剧本四道工序都有正式合同 DTO

## 环境变量

先复制示例文件：

```bash
copy .env.example .env
```

当前 `.env.example` 里预留了：

- `DeepSeek`
- `Gemini Flash / Pro`
- 模型 lane 开关
- 运行时超时

这些配置后续都会收口在 `main`，不会暴露给 renderer。

## 开发

```bash
npm install
npm run dev
```

## 验证

```bash
npm run typecheck
npm run build
```
