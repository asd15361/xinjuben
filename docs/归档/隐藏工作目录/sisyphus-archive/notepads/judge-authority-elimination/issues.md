## 2026-03-23 Initialization

- 当前已知阻塞：曾出现 root session descendant 超限导致 task() 无法创建新子会话。
- 若再次出现，优先记录错误并使用可用 session_id 续跑，避免重新探索。
