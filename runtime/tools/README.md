# Runtime 工具

这里放 Agent 运行时可以调用的最小工具契约和受控实现。

- `flight-search-contract.mjs`：校验查询条件并返回受控搜索结果；
- `search-task-state.mjs`：维护查询中、进度和停止状态；
- `condition-state.mjs`：维护条件版本和重新确认门；
- `search-error-policy.mjs`：区分异常原因并计算可重试组合；
- `official-handoff.mjs`：绑定候选与官方查看入口，并创建恢复轮次；
- `feishu.open_candidate`：在用户明确要求时，校验候选对应的官方 HTTPS 链接并尝试打开运行服务所在 Mac 的默认浏览器；权限或环境不可用时必须返回可点击链接作为兜底；
- `preference-memory.mjs`：处理已授权偏好的保存、读取和删除；
- `preference-intent.mjs`：识别保存、询问、单次使用和删除意图。

这里的受控实现只用于 Demo，不代表真实接口已经接通。
# P0 工具契约说明

工具只负责执行已确认的查询和返回可核验数据，不负责替用户做购买决定。

## 航班

- 工具：`flight_search`
- 输入：已确认的出发地、目的地、日期和用户明确的筛选条件。
- 输出：沿用 V1.0 航班结果字段，并为每个候选绑定原始详情链接。

## 酒店

- 工具：`hotel_search`
- 输入：已确认的酒店对象、入住日期、离店日期、成人数和房间数。
- 当前酒店查询只调用 RollingGo，不再做多供应商交叉查询。
- 输出：房态状态、可入住房型、价格、取消政策（若有）、供应商和原始详情/购买链接；RollingGo 失败或未核验状态必须保留。
- RollingGo 没有明确返回可售房型时，不得推断为无房；应区分“目标日期售罄”“未返回可核验房型”和“查询失败”。

## 统一约束

- 缺必要字段、用户未确认、预审非 `allow` 或工具返回不完整时，不调用或不展示推测结果。
- 工具返回的“有房”必须能够关联到原始供应商详情；无法关联时标记为“待核验”。

## P0 编排与日志

- `travel-input-contract.mjs`：将文本、图片和链接的上层抽取结果归一化为航班/酒店条件；
- `travel-result-format.mjs`：负责用户可见结果格式，内部来源和查询时间不混入 V1.0 航班结果；
- `travel-flow.mjs`：负责 onboarding、确认闸门、同款优先和用户触发替代；
- `hotel-provider-orchestrator.mjs`：调用 RollingGo，归一化房型、来源和详情链接；
- `travel-event-log.mjs`：记录输入摘要、字段抽取、确认、工具调用、结果、回复和安全事件。

日志与结果格式化器都不执行 OCR、支付、下单、改订或取消。
