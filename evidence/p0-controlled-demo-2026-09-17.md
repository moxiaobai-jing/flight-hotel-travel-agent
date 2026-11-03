# P0 受控 Demo 实际运行证据

## 运行信息

| 字段 | 实际值 |
|---|---|
| 运行入口 | `node tools/prd2/run-controlled-p0-travel.mjs` |
| 运行日期 | 2026-09-17 |
| 数据类型 | 受控 Demo Fixture |
| 是否真实库存/价格 | 否 |
| 是否执行交易动作 | 否 |

## 实际运行摘要

| 场景 | 实际输入 | 实际工具调用 | 实际状态 | 实际判定 |
|---|---|---|---|---|
| 新会话 onboarding | `/new` | 无 | `onboarding_shown` | 通过 |
| 酒店缺字段 | `查这家酒店` | 无 | `missing_required_fields` | 通过：追问入住日期、离店日期和入住成人数 |
| 同款酒店有房 | 确认示例酒店及日期、成人数、房间数 | `hotel_search(scope=same_option)` | `same_option_available` | 通过：返回 2 个房型、价格和详情链接 |
| 同款无匹配 | 确认无房酒店 | `hotel_search(scope=same_option)` | `same_option_unavailable` | 通过：未自动查询附近 |
| 用户明确找附近 | `那帮我找附近的酒店，距离优先。` | `hotel_search(scope=nearby)` | `alternative_available` | 通过：返回 2 个附近替代酒店、距离、价格和链接 |
| 房态无法核验 | 确认无法核验酒店 | `hotel_search(scope=same_option)` | `source_unconfirmed` | 通过：回复“当前无法核验房态”，没有说成无房 |
| 航班格式回归 | `帮我找一张杭州到广州的机票` | `flight_search` | `same_option_available` | 通过：保持 V1.0 逐候选格式 |

## 实际日志观察

每个场景实际生成了 `input_received`、字段抽取、确认、工具调用、工具结果和 `response_rendered` 等事件；附近替代场景额外生成了 `alternative_triggered`。图片和敏感内容本次未在该受控入口中传入，相关字段记为“未验证”。

## 结论边界

本记录证明的是 P0 受控流程和规则链路可以运行，不证明真实 OTA 库存、价格、链接时效、图片 OCR 质量或正式用户通过率。正式评测仍需按评测集进行人工走查并单独记录。
