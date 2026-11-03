# BC-050：G9 酒店查询被歧义工具名误路由为航班查询

| 项目 | 内容 |
|---|---|
| 时间 | 2026-09-19 |
| 用户场景 | 用户发送 Zasgo Hotel 酒店截图，并补充“9月21日-9月22日”，期望查询该酒店实时房态和全部可售房型 |
| 用户可见回复 | “当前暂时无法核验这家酒店的房态：查询服务返回异常，未提供酒店房型或价格数据。我不能据此判断是否有房或售罄。你可以稍后让我按相同条件重查。” |
| 实际工具调用 | 运行日志只出现 `codex_tool_call_received tool="search"`，随后进入 `flight_search_request_received`，航班参数为空并返回“机票查询条件不完整” |
| 缺失证据 | 没有出现 `hotel_search_tool_called`、`hotel_search_result_ready`，也没有进入 TourMind 或 RollingGo 查询 |
| 根因 | S06 同时暴露 `flight.search` 和 `hotel.search` 时，App Server 将命名空间工具的调用名压缩为同一个短名 `search`；服务端原先把裸 `search` 固定识别为航班工具，导致酒店请求被错误路由 |
| 主归因 | 工具协议与运行时路由 |
| 结论 | 失败；这不是酒店供应商无房，也不是图片识别失败，而是酒店工具未被调用 |
| 证据 | 用户截图：`/var/folders/7c/2p872n013hv1w8k4zk_2wswm0000gn/T/codex-clipboard-965b8b02-e3e2-4460-bb54-f09fd9a8f018.png`；服务日志：`/Users/xujingjing/.codex-workspaces/flight-planning-agent/logs/server.log` |

## 修复

- 航班工具改用唯一名称 `flight_search`，规范名为 `flight.flight_search`。
- 酒店工具改用唯一名称 `hotel_search`，规范名为 `hotel.hotel_search`。
- 裸名称 `search` 不再被航班或酒店处理器接受，避免静默误路由。
- S06 工具目录版本升级为 `s06-schedule-v19-unique-travel-tools`，确保旧线程归档并重新加载新目录。

## 回归

- 先增加了“唯一工具名、拒绝裸 `search`”回归测试，并观察到修复前按预期失败。
- 修复后 `go test ./...` 全部通过。
- 真实飞书回归待执行：先发送 `/new`，再发送同一张 Zasgo Hotel 截图和日期；日志必须出现 `hotel_search_tool_called`，随后才判断供应商房态结果。
