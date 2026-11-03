# Runtime Input

这里是 `codex app-server` 可读取的运行输入。

只放 Agent 执行所需的身份、产品规则、状态定义、工具契约和非密钥配置。Ground Truth、Oracle、测试 Fixture、隐藏答案和真实凭证不得放入此目录。

## 目录结构

- `SOUL.md`：Agent 身份和安全边界；
- `skills/`：统一旅行规划 Skill、机票规划 Skill、酒店规划 Skill、产品边界和状态模型；
- `tools/`：受控工具契约和运行实现；
- `state/`：运行状态的职责说明；
- `memory/`：授权偏好的职责说明；
- `config.yaml`：非密钥运行配置。

P0 2.0 统一入口为 `skills/travel-planning/SKILL.md`。其中机票查询继续沿用
`skills/flight-planning/SKILL.md` 的 V1.0 字段和确认规则；旧 `workspace/` 为 V1.0
只读基线，本目录属于独立的 `workspace-v2/` 实现。酒店专项规则位于
`skills/hotel-planning/SKILL.md`，由统一入口在酒店请求分支中调用。

## P0 工具模块

- `travel-input-contract.mjs`：统一输入分类和必要字段判断；
- `hotel-search-contract.mjs`：单个受控酒店供应商的房态、房型和替代查询契约；
- `hotel-provider-orchestrator.mjs`：调用 RollingGo，统一整理房态、房型、价格、来源和详情链接；
- `travel-result-format.mjs`：V1.0 航班格式和酒店结构化结果；
- `travel-flow.mjs`：确认闸门、同款查询和用户触发替代；
- `travel-event-log.mjs`：结构化事件日志和敏感字段保护。

所有模块都只处理已确认的受控输入；当前 RollingGo 单供应商实现不代表已接入支付或订单写入。房态、价格和房型仍必须以 RollingGo 返回的实时结果为准。
