# 旧项目 API 与 ENV 迁移清单（第一版）

## 一、这份清单回答什么问题

这份清单只回答一件事：

**旧项目的 API / env / provider 路由里，哪些东西值得继承，哪些实现方式绝对不能带进新项目。**

## 二、先说结论

旧项目里真正该迁的是：

- env 语义
- provider 配置结构
- 模型路由规则
- timeout / cache / cooldown / fallback 这类运行时行为

旧项目里绝对不该迁的是：

- renderer 直接读密钥
- renderer 直接拼请求头
- renderer 直接访问外部 API

也就是说：

**迁“规则和语义”，不迁“前端直接拿执行权”的做法。**

## 三、旧项目里值得保留的配置结构

### DeepSeek 配置语义

建议保留：

- `apiKey`
- `baseUrl`
- `model`
- `systemInstruction`
- `timeoutMs`

参考：

- [config.ts](/D:/project/juben/src/config.ts)
- [.env.example](/D:/project/juben/.env.example)

### 第二模型 配置语义

建议保留：

- `apiKey`
- `baseUrl`
- `flash model`
- `pro model`
- `systemInstruction`
- `timeoutMs`

关键点：

- 第二模型 在旧项目里不是单模型，而是明确分成 `flash` 和 `pro` 两条 lane

## 四、旧项目里值得保留的路由规则

### 核心 routing 思路

旧项目不是“固定用一个模型”，而是：

- 默认 DeepSeek
- 长上下文 / 跨工序 / 详纲 / 人物小传走 第二模型 fast lane
- P0 风险 / 结局审校 / 全季审校走 第二模型 pro lane

参考：

- [modelRoutingService.ts](/D:/project/juben/src/renderer/src/services/modelRoutingService.ts)
- [executionDispatch.ts](/D:/project/juben/src/renderer/src/services/generation/executionDispatch.ts)
- [modelQuotaStateService.ts](/D:/project/juben/src/modelQuotaStateService.ts)
- [model-routing-service.test.ts](/D:/project/juben/tests/model-routing-service.test.ts)

### 这些行为也值得保留

- lane enable 开关
- soft / hard context threshold
- family 级系统指令覆盖
- 失败后跨 lane fallback
- 第二模型 配额 cooldown

## 五、旧项目里值得保留的运行时语义

### timeout

建议保留：

- `DEEPSEEK_TIMEOUT_MS`
- `第二模型_TIMEOUT_MS`
- `RUNTIME_FETCH_TIMEOUT_MS`

### cache

建议保留：

- DeepSeek 响应缓存 TTL
- 最大缓存条目数

### runtime flags

建议保留：

- `第二模型_RELAX_SAFETY`
- `AI_PROVIDER_TRACE`

参考：

- [deepseek-provider.ts](/D:/project/juben/src/generation/pipeline/deepseek-provider.ts)
- [第二模型-provider.ts](/D:/project/juben/src/generation/pipeline/第二模型-provider.ts)

## 六、旧项目里不该迁入新项目 renderer 的东西

### 不该保留 1：renderer 直接读密钥

旧项目有一些 renderer service 直接读取：

- `DEEPSEEK_API_KEY`
- `MARKET_NEWS_API_KEY`
- `MARKET_52API_KEY`

这种做法新项目不能再有。

### 不该保留 2：renderer 直接拼请求头

例如：

- `Authorization`
- `X-Api-Key`

这类都不应该继续由 renderer 负责。

### 不该保留 3：renderer 直接访问外部 API

旧项目里市场情报和网络调用有不少直接发生在 renderer。

参考：

- [marketCoachService.ts](/D:/project/juben/src/renderer/src/services/marketCoachService.ts)
- [marketDataService.ts](/D:/project/juben/src/renderer/src/services/marketDataService.ts)
- [marketDataUtils.ts](/D:/project/juben/src/renderer/src/services/marketDataUtils.ts)
- [runtimeNetworkService.ts](/D:/project/juben/src/renderer/src/services/runtimeNetworkService.ts)

## 七、新项目应该怎么做

### 正确边界

新项目应该采用：

- `renderer`：只表达请求意图
- `preload`：白名单桥接
- `main`：持有真实 env、provider、base URL、timeout、cooldown 和外部请求执行权

### 正确入口

renderer 应该只调用类似：

- `window.api.ai.getProviderSummary()`
- `window.api.ai.generate(...)`
- `window.api.ai.chat(...)`
- `window.api.network.fetch(...)`

真正的 provider 执行要放到 `main`。

## 八、这次迁移建议保留的 env 清单

### 建议保留到新项目 `.env.example`

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_MODEL`
- `DEEPSEEK_SYSTEM_INSTRUCTION`
- `DEEPSEEK_TIMEOUT_MS`
- `第二模型_API_KEY`
- `第二模型_BASE_URL`
- `第二模型_FLASH_MODEL`
- `第二模型_PRO_MODEL`
- `第二模型_SYSTEM_INSTRUCTION`
- `第二模型_TIMEOUT_MS`
- `MODEL_ROUTER_ENABLE_DEEPSEEK`
- `MODEL_ROUTER_ENABLE_第二模型_FLASH`
- `MODEL_ROUTER_ENABLE_第二模型_PRO`
- `RUNTIME_FETCH_TIMEOUT_MS`

### 暂缓迁入

市场情报相关 env 可以后面第二阶段再迁，不用第一天全塞进来。

## 九、新项目建议的模块归属

### 建议新增

- `src/main/infrastructure/runtime-env`
- `src/main/infrastructure/providers`
- `src/main/application/ai`
- `src/preload/api/ai.ts`

### 不该出现

- `src/renderer/src/services/*` 里直接拿 key 和发外部请求

## 十、迁移优先级

### 第一优先级

- 配置结构
- lane 开关
- provider summary
- timeout 语义

### 第二优先级

- generate / chat 路由
- fallback / cooldown

### 第三优先级

- cache
- trace
- 市场情报 API

## 十一、最终结论

旧项目这条线最值得继承的，不是“某个 service 文件怎么写”，而是：

- provider 配置结构
- 模型路由规则
- 运行时保护机制

新项目如果保住这些语义，同时把执行权彻底收回到 `main`，就能既继承旧项目经验，又避免把敏感配置和外部调用能力泄露给 renderer。

