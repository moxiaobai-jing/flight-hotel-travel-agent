# Bad Case

这里记录可复现的失败案例：现象、输入、期望、实际结果、初步根因、修复建议和回归路径。

修复后保留原始 Bad Case，不删除失败证据。

当前新增记录：

- `BC-046-hotel-order-year-and-room-scope.md`：酒店订单缺少年份时被要求确认，且参考房型被错误当成唯一查询范围。
- `BC-047-unrecognized-image-missing-fallback.md`：无法提取航班或酒店信息时描述图片内容，未使用统一兜底话术。
- `BC-048-hotel-complete-input-confirmation-gate.md`：酒店条件补齐后仍要求二次确认，短确认消息又因缺少上下文被安全预审拦截。
- `BC-049-g9-reserved-tool-namespace-start-failure.md`：G9 切换到包含酒店工具的 S06 目录后，`browser` 保留命名空间冲突导致线程无法启动。
- `BC-050-g9-search-tool-name-collision.md`：酒店和航班工具被 App Server 压成同一个 `search` 短名，酒店请求误路由到航班查询。
- `BC-051-hotel-provider-auth-and-empty-inventory.md`：RollingGo 缺少 API Key 返回 401，同时 TourMind 未返回该日期的实时房型。
- `BC-068-推算抵达时间后重复追问.md`：抵达时间已由全程时长推算，却仍被列为缺失字段重复追问。
