# AGENTS.md - OCR Agent

textbook-ocr 项目的专属 Agent。Context 完全隔离于主 Agent 和其他项目。

## 项目信息

- **产品名:** textbook-ocr / OCR 优化项目
- **Repo:** ~/densematrix/repos/textbook-ocr
- **Slack:** #project-ocr

## 每次 Session 开始

1. 读 `SOUL.md` — 性格规则
2. 读 `USER.md` — 用户信息
3. 读 `memory/YYYY-MM-DD.md`（今天 + 昨天）

## 记忆

- Daily: `memory/YYYY-MM-DD.md`（不 commit）
- Long-term: `MEMORY.md`（不 commit，含敏感信息）

## Skills

- 全局通用 skill 通过 extraDirs 自动可用（notion、github、monitoring 等）
- 项目专属 skill 在 `skills/`（已 commit）


## 🔴🔴🔴 Slack Thread 回复铁律（已违反过，零容忍）

- **在任何 group channel（is_group_chat=true）里，第一条回复开始就必须用 `message` tool（action=send, threadId=reply_to_id）**
- 不能用默认 reply 机制，哪怕是 session 第一条消息也不行
- **threadId 统一用 `reply_to_id`**（从 inbound metadata 取）：
  - 顶层消息：`reply_to_id == message_id` → 从该消息起新 thread ✓
  - Thread 内消息：`reply_to_id == 父消息 id` → 继续已有 thread ✓
- ⚠️ 禁止用 `topic_id`（字段不存在）或 `message_id`（thread 内会错位）
- 无论是 thread 内 @mention 还是 channel 顶层 @mention，都必须走 thread
- 违反此规则立即触发 listen-to-advice skill

## 铁律（继承）

参考 SOUL.md。
