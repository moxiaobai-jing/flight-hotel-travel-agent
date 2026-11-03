# 机票酒店小助手｜Test Journey 索引

## 当前正式测试路径

请进入 [`current/`](./current/) 执行当前版本测试：

- [P0-J00：统一入口与参考材料](./current/P0-J00-统一入口与参考材料.md)
- [P0-J01：航班同款核验与替代](./current/P0-J01-航班同款核验与替代.md)
- [P0-J02：酒店同款、房型房态与详情](./current/P0-J02-酒店同款房型房态与详情.md)
- [P0-J03：替代、比较与详情交接](./current/P0-J03-替代比较与详情交接.md)
- [P0-S01：失败兜底与用户控制](./current/P0-S01-失败兜底与用户控制.md)

这 5 条路径来自 PRD 1.0 的三条产品 Journey、UC-01～UC-04 以及 C01/C02/S01 支撑路径，专门对应“机票酒店小助手”。

## 旧版兼容回归材料

当前目录下的 `J-01`～`J-08` 是从 workspace 1.0 保留下来的 Flight Planning 评测材料，用于验证旧版机票能力没有回归，不是本次产品的主 Test Journey。执行当前产品测试时不要从这些文件开始。

`P0-onboarding-and-reference-input.md`、`P0-hotel-availability-and-alternative.md` 和 `P0-v1-flight-format.md` 是此前的过渡入口，仍保留以兼容已有脚本；正式测试以 `current/` 目录为准。
