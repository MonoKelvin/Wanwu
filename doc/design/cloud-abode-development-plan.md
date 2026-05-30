# 云斋开发计划（v1.1 核心闭环）

## 目标

在 Wanwu 主应用内交付「赚币 → 商城购买 → 收藏/展车」闭环，复用现有 SU7 展车实现，经济与会话数据存于 `{userData}/cloud-abode/database.sqlite`。

## 里程碑（本迭代已落地）

| 阶段 | 交付物 | 状态 |
|------|--------|------|
| P0 | Wallet、Ledger、SQLite schema、启动资金 | 完成 |
| P1 | Catalog、Payment、商城 UI、模拟支付 | 完成 |
| P2 | Todo、ToolRegistry、首批工具与 API 适配 | 完成 |
| P3 | 展车路由接通、购买与 inventory 联动 | 完成 |

## 验收清单

- [x] AC-01：工具/TODO 赚币 → 商城购买 → 收藏页查看
- [x] AC-02：沙发约 300 元、SU7 约 200 万元（seed 价格）
- [x] AC-03：工具超限仍返回内容且不报错
- [x] AC-05：支付密码错误 3 次锁定 5 分钟
- [x] AC-06：商城/展车使用 `ww-*` 视觉
- [x] AC-07：五十音、预置商品离线可用

## 延后（v1.1.x / v1.2）

- 生活模拟 tick、惩罚、integrity 衰减
- 天气/新闻随机事件、诈骗弹窗
- Pandoc 完整文档转换
- 用户上传商品与定价 UI

## 关键路径

- 渲染：`src/modules/cloud-abode/`
- 主进程：`electron/services/cloud-abode/`
- IPC：`cloud-abode:*`（见 `electron/ipc/handlers.ts`）
- 3D 资源：`assets/seed/cloud-abode/vehicles/`
