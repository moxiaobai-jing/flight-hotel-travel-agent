# Evidence Store

这里仅记录 Demo 实际运行后产生的证据：Agent 原文回复、可见 Trace、任务状态、候选字段、链接动作和副作用。

没有观察到的内容必须写“未验证”，不能根据预期补齐。

## 目录结构

- `trial-log.md`：每次 Demo 运行的输入、回复、状态和判定；
- `traces/`：脱敏工具调用和任务状态证据；
- `bad-cases/`：可复现失败案例和修复回归记录。

## 旅行 P0 事件日志

Runtime 的事件日志使用固定事件类型记录完整链路：

`onboarding_shown`、`input_received`、`fields_extracted`、`conditions_confirmed`、
`tool_invoked`、`tool_result_received`、`response_rendered`、`alternative_triggered`、
`user_link_opened`、`user_outcome`、`safety_decision`。

日志只保存结构化摘要。图片只记录 `attachmentRef` 等引用，不复制图片内容；原始输入、完整身份证件号、支付信息和敏感请求原文禁止写入。没有实际观察到的字段必须记录“未验证”。

评测记录至少关联：`sessionId`、实际输入摘要、用户可见回复、工具调用、工具结果、状态变化、日志事件和最终判定。
