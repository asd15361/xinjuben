- 2026-03-24：`changeProjectStage` 只负责 main authority，不会自动同步 renderer 的 `currentStage`；renderer 必须在 IPC 成功后显式用统一 action 收口本地 stage truth。
- 2026-03-24：`StageViewport` 已经是 `currentStage === 'x' && <Stage />` + `key={currentStage}` 模式，切页时只挂当前 stage，不需要额外做后台卸载逻辑。

- 2026-03-24: 为避免 Node ESM 测试导入失败，storage 新增模块内部本地相对导入统一补 .ts 扩展名；迁移测试直接验证 legacy -> shards + index。

- 2026-03-24：性能观测新增统一 `[perf]` 日志口径；main 负责记录 `open_project_shell / stage_payload / change_project_stage`，renderer 负责记录 `list_refresh / renderer_hydrate_* / script_service_ready / first_interactive`，避免前后端混记同一段耗时。

- 2026-03-24：`ScriptSceneList` 当前虚拟列表把 `ref={virtualizer.measureElement}` 直接挂在每个绝对定位 item 上，同时卡片展开会显著改变高度；如果继续用默认按滚动实时测量，展开/收起和滚动会不断触发重新测量与布局计算，容易在 Electron 里表现为侧边栏点击卡住、滚动掉帧、窗口拖动变慢。
- 2026-03-24：`ScriptSceneList` 的 `estimateSize: () => 120` 对“收起摘要卡 + 可展开整段 screenplay”的混合高度模型明显偏小；当展开内容远高于 120px 时，虚拟器需要频繁纠偏 `start/size/totalSize`，这是典型 layout thrash 风险点。
- 2026-03-24：`ScriptSceneList` 外层滚动容器虽然有 `flex-1 overflow-auto min-h-0`，但同时加了 `contain: 'strict'`；在需要动态测量高度的虚拟列表里，这个 containment 会放大滚动/重排敏感性，优先应降为更保守的 containment 或移除后再测。
- 2026-03-24：这轮“切 stage 统一改 `switchStageSession`”不能只看口头结果，必须直接复核文件内容与 grep；先前存在补丁未真正落盘的情况，最终以 `rg "window\.api\.workspace\.changeProjectStage\(" src/renderer/src` 清零为准。
- 2026-03-24：当前 renderer 代码并非所有页面都保留旧的 `changeProjectStage -> hydrateStagePayload -> applyStageTransition` 形态；部分文件已退化为 `setStage(...)` 本地跳转，修复时要按实际代码改为 `switchStageSession(...)`，不能机械套旧补丁。
