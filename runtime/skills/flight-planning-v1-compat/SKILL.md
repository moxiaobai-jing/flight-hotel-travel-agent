---
name: flight-planning-v1-compat
description: Use when the new travel-planning P0 entry has confirmed a flight query and must preserve the existing V1.0 flight fields, exact-time matching, sorting, and official-detail handoff.
---

# 航班 V1.0 兼容层

这是新版入口对旧版机票能力的兼容层。必须保留旧版 `runtime/skills/flight-planning/SKILL.md` 的既有字段、结果格式、排序、飞猪详情交接和安全边界；旧文件本身不得改写。

## 调用方式

1. 读取新版入口传入的已确认条件和 `travel-planning-p0-v2/references/flight-contract.md`。
2. 再读取旧版 `../flight-planning/SKILL.md` 及其 `references/product-boundaries.md`、`references/state-model.md`。
3. 只调用已确认的航班查询工具；无航班号时按出发时间与抵达时间完全匹配。上游 `flight.time_infer` 已推算出的时间属于已确认条件，不得在兼容层再次追问。
4. 保持 V1.0 逐候选结果格式，并给每个候选绑定详情链接。
5. 同款失败后只返回具体失败原因和待用户确认的替代范围，不自动扩大日期或时间。

当识别到出发时间和抵达时间时，兼容层必须将两者传入查询工具并执行完全匹配；没有精确结果时不得泄漏相近时间候选。只有用户明确同意“前后三小时”或“当天任意时段”后，才分别传入 `alternative_scope=plus_minus_3_hours` 或 `alternative_scope=same_day`。

## 冲突处理

新版 PRD 1.0 的明确规则优先于旧版文档中与之冲突的旧示例：航班号不是必要字段，乘机人数不在 P0 确认范围，精确出发/抵达时间匹配优先于相近时间匹配。除此之外不改变旧版能力。

`/new` 的欢迎语属于新版 `travel-planning-p0-v2` 统一入口，不属于本兼容层。即使读取旧版 `flight-planning/SKILL.md`，也不得发送其中的旧版“机票规划助手”欢迎语；本兼容层只在统一入口完成 onboarding 后处理已确认的航班请求。

## 禁止

不下单、不支付、不改签、不取消；不伪造价格、余票或详情链接；不把替代航班标为同款。
