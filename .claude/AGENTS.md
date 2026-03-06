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

## 铁律（继承）

参考 SOUL.md。
