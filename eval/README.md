# Eval Control Plane

这里存放评测人员使用的测试路径、Ground Truth、Oracle 和受控 Fixture。

这些材料不能复制到 `runtime/`，避免被测 Agent 直接读取测试答案。

## 目录结构

- `test-journeys/`：评测人员执行的 J-01～J-08 和 P0 2.0 测试路径；
- `fixtures/`：受控 Demo 数据，不代表真实航班事实；
- Ground Truth、Oracle 和隐藏预期只供评测人员使用，不注入 Runtime。

P0 2.0 的最小评测路径：

- `P0-onboarding-and-reference-input.md`：onboarding、模糊意向和图片/链接参考输入；
- `P0-hotel-availability-and-alternative.md`：酒店必要字段、房型房态和用户触发替代；
- `P0-v1-flight-format.md`：航班结果格式回归。

每条路径都要记录实际输入、实际回复、工具调用、事件日志和最终判定。没有实际观察到的内容写“未验证”，不能根据文档预期补写。
