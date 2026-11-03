# Ground Truth

这里存放评测控制面使用的 Ground Truth、Oracle 和隐藏预期。

Ground Truth 不属于 Agent 运行输入，不能复制到 `workspace/runtime/`。

- 每条 GT 只定义一个主要判断目标；
- GT 必须绑定 Use Case、测试路径、应用版本和规则版本；
- 缺失的工具轨迹、状态或证据标记为“未验证”，不能根据模型回复推断为通过；
- 本目录的 GT 用于后续扩展 Case、组成评测集和记录 Trial 判定。

当前目录中的 GT 仍有一条早期机票规划 Ground Truth，属于兼容回归材料，不是“机票酒店小助手”当前 P0 的完整 Ground Truth 集。当前 P0 Test Journey 以 `../test-journeys/current/` 为正式人工测试入口；后续应按其中的 UC-01～UC-04 和 C01/C02/S01 补齐对应 GT。

历史兼容 GT：

- [GT-J01-001：信息不完整时澄清，确认前不查询](<./GT-J01-001-信息不完整时澄清确认前不查询.md>)
