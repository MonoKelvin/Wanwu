# Bootstrap

Bootstrap 是 Twitter（现 X）团队 2011 年开源的前端 UI 框架，由 Mark Otto 与 Jacob Thornton 在内部 Hack Week 项目中诞生。它以 **12 列栅格、预制组件与响应式断点** 降低了 Web 界面搭建门槛，长期是入门教程与企业后台的默认选择。

![Bootstrap 标志（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Bootstrap_logo.svg/320px-Bootstrap_logo.svg.png)


从读者角度，把「标准书描述」与「真实饲养体验」对照着看，更容易判断自己是否适合该主题：时间投入、预算、空间与家庭成员（老人、幼儿、其他宠物）都会改变答案。以下内容在常识基础上稍作延展，便于形成 3–5 分钟可读完的完整印象。

## 背景与历史

Bootstrap 原名 Twitter Blueprint，v2 引入响应式，v3 移动优先，v4 迁移 Sass 与 flexbox 栅格，v5 移除 jQuery 依赖并强化自定义 CSS 变量。尽管 Tailwind 等 utility-first 方案崛起，Bootstrap 仍通过 **Bootstrap Icons**、RTL 支持与官方 Themes 保持企业市场份额。

时间线与地域背景有助于理解它为何在特定年代走红，以及今日在收藏、实用或文化象征中的位置。


## UX 原则与产品影响

- **一致性**：Button、Modal、Navbar 等组件行为统一，适合快速 MVP 与内部工具。
- **栅格系统**：`container` + `row` + `col-*` 模型 teaching 了整代开发者响应式思维。
- **可访问性改进**：v5 起加强 focus 样式、ARIA 角色文档与 color contrast 工具类。
- **定制**：Sass 变量覆盖主色、圆角、字体，可与 design system 部分对齐。

Bootstrap 的产品 trade-off 是「看起来像 Bootstrap」的同质化；成熟团队常在其上深度定制或迁移至 headless + Tailwind 架构。

## 冷知识

- Bootstrap 名字来自「pull yourself up by your bootstraps」，寓意「白手起家搭界面」。
- 早期 Bootstrap 与 jQuery 深度绑定，许多 legacy 后台至今仍是 `$.modal()` 调用栈。
- Bootstrap 5.3 正式支持 **color modes**（浅色/深色/自动），追赶系统主题趋势。
- Admin 模板市场（如 CoreUI、Tabler）大量 fork Bootstrap 结构，形成庞大衍生生态。

趣闻应可核对来源；若仅流传于社群梗，建议标注为「说法之一」以免误作史实。


## 参考与延伸阅读

- [Bootstrap 官网](https://getbootstrap.com/)
- [Bootstrap GitHub](https://github.com/twbs/bootstrap)
- [维基百科：Bootstrap (front-end framework)](https://en.wikipedia.org/wiki/Bootstrap_(front-end_framework))
