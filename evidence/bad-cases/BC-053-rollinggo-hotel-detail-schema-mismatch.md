# BC-053：RollingGo 酒店详情加载失败（参数协议不匹配）

## 基本信息

- 时间：2026-09-20
- 场景：G9 机酒小助手查询扎斯戈酒店房态
- 查询条件：2026 年 9 月 20 日入住、9 月 21 日离店、1 位成人、1 间房
- 用户可见结果：`TourMind：未返回实时可售房型`；`RollingGo：酒店详情暂时加载失败`
- 证据：用户截图 `/var/folders/7c/2p872n013hv1w8k4zk_2wswm0000gn/T/codex-clipboard-5bff99e6-7538-4cf2-a50f-52d519afbece.png`

## 事实核验

通过 RollingGo MCP 只读直连复现：

- API Key 鉴权正常；`initialize` 和 `tools/list` 均成功。
- `searchHotels` 的真实入参字段为 `place`、`placeType`、`size`、`checkInParam`、`filterOptions`、`hotelTags`、`originQuery`，其中 `originQuery`、`place`、`placeType` 为必填。
- 当前适配器只认识 `hotel`、`check_in`、`check_out` 等通用字段，没有适配 RollingGo 的字段名，因此实际发送的搜索参数是 `{}`。
- RollingGo 在空参数下返回了默认日期和默认城市的酒店列表，第一家为吉隆坡的“菲斯时尚酒店”，不是用户查询的扎斯戈酒店。
- 当前适配器从 JSON 数字中取酒店 ID 后使用字符串格式化，`1587606` 被格式化成 `1.587606e+06`。
- `getHotelDetail` 的真实字段为 `hotelId`、`name`、`occupancyParam`、`dateParam`、`filter`。当前只填入了错误格式的 `hotelId`，未填入日期和入住参数。
- 详情接口返回：`success=false, code=6300, message=The hotel details couldn't be completed temporarily, please try again later.`

## 结论

这不是“酒店没有房”，也不是 API Key、网络或图片识别失败，而是 RollingGo 适配层与实际 MCP 工具协议不一致：搜索条件没有传入，返回结果被误当成目标酒店；随后酒店 ID 类型和详情参数又不符合接口要求，导致详情调用失败。

## 影响

- 当前 RollingGo 结果不可作为房态、房型或价格依据。
- 在修复并回归之前，必须向用户返回“暂时无法核验”，不能展示为售罄，也不能展示搜索结果中的无关酒店。

## 待修复项

1. 按 RollingGo `searchHotels` 的实际 schema 映射酒店名、地点类型、日期和筛选条件，并校验请求参数不为空。
2. 保持酒店 ID 的整数/字符串精度，禁止浮点科学计数法传给详情接口。
3. 按 `getHotelDetail` 的 schema 补齐 `dateParam`、`occupancyParam` 等详情参数。
4. 增加“搜索结果酒店名称/城市与用户目标不一致时拒绝继续查详情”的保护。
5. 修复后用扎斯戈酒店及另一个可检索酒店做真实只读回归，并记录原始房型、价格和详情链接。

## 修复与回归

- 已按 RollingGo 实际 schema 重写 `searchHotels` 和 `getHotelDetail` 参数映射。
- 已改用 `json.Decoder.UseNumber()`，避免酒店 ID 被转换成科学计数法。
- 已同时匹配返回结果的 `name` 和 `nameEn` 字段，避免中英文名称分离时误判目标酒店不存在。
- 已增加供应商 `success=false` 的错误识别，详情接口失败不再被包装成“无房”。
- 代码回归：`go test ./internal/hotel` 通过。
- 真实只读回归：英文名 `Zasgo Hotel` 已成功进入详情接口；2026-09-20 至 2026-09-21 的真实结果为“暂无合适报价或已满房”，这是供应商返回的房态结论，不再是加载失败。
- 中文名单独查询在 RollingGo 返回空结果；若 OCR 同时提取英文名，适配器可以命中。仅有中文别名时仍需后续增加别名/多语言搜索策略。
- G9 已重新构建并重启，健康检查通过，飞书接收器已连接。
- 后续修复：酒店查询请求新增 `hotel_aliases`；当主名称为中文、别名为 `Zasgo Hotel` 时，真实只读回归成功命中 ZASGO 详情接口，最终返回供应商房态“暂无合适报价或已满房”。中间中文查询空结果未展示给用户。
