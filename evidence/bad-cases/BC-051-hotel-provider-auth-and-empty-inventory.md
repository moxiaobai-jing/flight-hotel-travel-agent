# BC-051：酒店双供应商一侧鉴权缺失，另一侧未返回实时房型

| 项目 | 内容 |
|---|---|
| 时间 | 2026-09-19 |
| 用户场景 | 用户在 G9 查询马罗南沟附近酒店，条件为 2026 年 9 月 21 日入住、9 月 22 日离店、1 位成人、1 间房 |
| 用户可见回复 | “当前无法核验这家酒店的完整实时房态。TourMind：未返回可实时预订的房型；RollingGo：数据源连接失败。因此我不能据此判断为有房或售罄。” |
| 路由结果 | 日志确认调用的是 `hotel_search`，出现 `hotel_search_tool_called` 和 `hotel_search_result_ready`；不是工具名冲突或航班误路由 |
| TourMind 状态 | MCP 请求已进入 TourMind，但 `query_room_rates` 没有返回可实时预订的房型，聚合层保留为未核验/无可用房型，不推断为售罄 |
| RollingGo 状态 | 当前 G9 `.env` 没有 `ROLLINGGO_API_KEY`；对 `https://mcp.rollinggo.cn/mcp` 做只读 `initialize` 探测返回 HTTP 401 Unauthorized |
| 根因 | RollingGo 配置启用但鉴权密钥未注入运行进程；这不是网络不可达，也不是酒店无房结论 |
| 主归因 | 外部供应商配置与鉴权 |
| 结论 | 失败；当前只能返回“无法完整核验”，不能返回有房、售罄或价格 |
| 证据 | 用户截图：`/var/folders/7c/2p872n013hv1w8k4zk_2wswm0000gn/T/codex-clipboard-a8152398-fab8-4c06-aa8e-bd62486a7d36.png`；服务日志：`/Users/xujingjing/.codex-workspaces/flight-planning-agent/logs/server.log` |

## 后续处理

- 由管理员将 RollingGo 官方 API Key 安全写入 G9 运行环境的 `ROLLINGGO_API_KEY`，不要把 Key 直接发送到聊天中。
- 重启 G9 后，用同一酒店、同一日期、同一人数条件复测。
- 预期日志应出现 RollingGo 的 MCP `tools/list`、`searchHotels`、`getHotelDetail` 请求；若仍失败，再依据 HTTP 状态区分 401、403、404、429 或超时。
- 当前已有的 `mcp_...` Key 不自动视为 RollingGo Key；不同 MCP 服务的密钥不能混用，除非服务方明确说明兼容。

## 修复进展

- 已修复安全 dotenv 白名单未允许 `ROLLINGGO_API_KEY` 的问题，并重新编译安全加载器。
- 用户已通过本机隐藏输入框配置新的 Key；Key 未在日志或聊天中输出。
- G9 重启后 RollingGo `initialize` 返回 HTTP 200，`tools/list` 成功返回 `searchHotels`、`getHotelDetail` 和 `getHotelSearchTags`。
- 当前状态：RollingGo 鉴权和 MCP 基础连接已恢复；同一酒店的真实房态、房型和价格仍待飞书端复测。
