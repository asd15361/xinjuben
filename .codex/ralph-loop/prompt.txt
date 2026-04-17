/skills
$ralph-wiggum-codex
Run this in: D:\project\xinjuben
Objective: 连续做 20 轮只读排查，持续发现新增问题并直接并入唯一计划文档，不修实现、不新建第二份计划。
Context (optional): 当前项目已经进入“继续排查残口、继续收唯一真相”的阶段。重点不是修代码，而是继续找：第二真相、第二裁判口、旧测试脚本、旧字段、旧术语、影子状态、影子 helper/hook、只显示第一条问题的摘要层、以及任何会让测试结果失真的口子。所有新发现必须直接回填到唯一计划与当前任务卡。
Constraints:
- 只读排查为主，不修实现代码。
- 不新建第二份计划文档。
- 只允许把新增问题写进 `docs/plans/计划总表.md` 和 `docs/当前工作区/active-task（当前任务卡）.md`。
- 不把问题丢给某个具体人，不写“给同事B”之类措辞。
- 默认继续用中文、大白话汇报。
- 每轮优先排查“测试证据是否可信”，再排查“产品是否有问题”。
- 排查期间可以读取源码、脚本、文档、contracts、store、renderer、tools/e2e，但不要修实现。
- 如果为了证据必须跑命令，优先只读命令；不要启动重型长跑任务。
- 如果用了代理、浏览器、MCP 或临时进程，结束前必须收尾，不留残进程。
Non-goals:
- 不修业务实现。
- 不做重构。
- 不跑正式 E2E 长测。
- 不新增计划、台账、临时总结文档。
- 不把旧测试结果直接升级为产品结论。
Success criteria:
- 完成 20 轮有效排查循环，不是表面重复搜索。
- 每轮只把“新增、非重复、已定性”的问题写入唯一计划与当前任务卡。
- 明确区分“主链问题”与“测试证据层问题”。
- 不产生第二份计划文档。
- 不修改实现代码，除计划/任务卡外不新增执行性改动。
- 结束时给出本轮新增问题清单、证据文件路径、以及当前总体判断。
Validation:
- `git diff --name-only -- "docs/plans/计划总表.md" "docs/当前工作区/active-task（当前任务卡）.md"`
- `git diff --stat -- "docs/plans/计划总表.md" "docs/当前工作区/active-task（当前任务卡）.md"`
- `Get-Content -Tail 120 "docs/plans/计划总表.md"`
- `Get-Content -Tail 120 "docs/当前工作区/active-task（当前任务卡）.md"`
Progress scope:
- docs/plans/计划总表.md
- docs/当前工作区/active-task（当前任务卡）.md
Source of truth (optional):
- AGENTS.md
- 3.agents.md
- 2.rules.md
- docs/engineering-workflow（工程排障与根因修复）.md
- docs/plans/计划总表.md
- docs/当前工作区/active-task（当前任务卡）.md
Recommended model: gpt-5.3-codex
Reasoning effort: high
Risk profile: medium (不改实现代码，但会持续判定项目真相、测试证据真伪，并持续写入唯一计划，要求约束严格且不能重复造口径)
Suggested runner flags:
--autonomy-level l1
--max-iterations 20
--max-consecutive-failures 3
--max-stagnant-iterations 2
--progress-scope "docs/plans/计划总表.md"
--progress-scope "docs/当前工作区/active-task（当前任务卡）.md"
--idle-timeout-seconds 90
--hard-timeout-seconds 5400
--timeout-retries 1
--events-format both
--progress-artifact
--validate-cmd "git diff --name-only -- \"docs/plans/计划总表.md\" \"docs/当前工作区/active-task（当前任务卡）.md\""
--validate-cmd "git diff --stat -- \"docs/plans/计划总表.md\" \"docs/当前工作区/active-task（当前任务卡）.md\""
--validate-cmd "Get-Content -Tail 120 \"docs/plans/计划总表.md\""
--validate-cmd "Get-Content -Tail 120 \"docs/当前工作区/active-task（当前任务卡）.md\""
