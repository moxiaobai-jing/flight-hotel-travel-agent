# BC-049｜G9 S06 工具目录使用保留命名空间导致整批处理失败

| 项目 | 内容 |
|---|---|
| 时间 | 2026-09-19 |
| Journey | J-01：输入参考材料并确认查询对象 |
| 用户原始输入 | `/new` 后发送 Zasgo Hotel 酒店截图，期望识别酒店并查询房态 |
| Agent 实际表现 | 飞书显示“本批处理失败，请重新发送”，没有进入图片识别、酒店条件确认或 `hotel.search` |
| 关键日志 | `dynamic tool namespace collides with a reserved Responses API namespace: browser` |
| 失败位置 | App Server `thread/start` 阶段 |
| 主归因 | 工具目录命名空间与 App Server 保留命名空间冲突 |
| 走查结论 | 失败，记录为 BC-049 |
| 证据 | 用户截图：`/var/folders/7c/2p872n013hv1w8k4zk_2wswm0000gn/T/codex-clipboard-8da341a8-9f42-460b-9ffc-7c1029325282.png`；运行日志：`flight-planning-agent/logs/server.log` |

## 根因

G9 切换到包含 `hotel.search` 的 S06 动态工具目录后，同时暴露了 `browser.open`。Codex Responses API 将 `browser` 视为保留命名空间，导致整个动态工具目录被拒绝，线程无法启动。此时酒店 MCP 尚未被调用，因此本次不是 TourMind、RollingGo 或图片 OCR 的失败。

## 修复

- 将内部动态工具从 `browser.open` 改为 `feishu.open_candidate`；
- 同步更新 workspace-v2 的 Skill、评测集和工具说明；
- 保留原有浏览器安全边界：只允许打开已经返回的候选 HTTPS 详情链接，不执行购买、支付或下单；
- 增加回归断言：S06 目录不得暴露 `browser` 命名空间。

## 回归结果

- `go test ./...`：通过；
- 真实 App Server S06 启动/恢复回归：通过；
- S06 目录当前包含 `hotel.search` 和 `feishu.open_candidate`，不包含 `browser` 命名空间；
- G9 8081：健康；
- Vision 12 8082：健康；
- 已重建并重启 G9。

## 待用户复测

在 G9 机器人中重新发送 `/new`，再发送同一张酒店截图。预期应进入图片识别和酒店查询流程；如果后续仍失败，应根据新的 `hotel_search_tool_called` 或供应商错误日志继续定位，而不能沿用本条旧根因。
