# Ant Design

Ant Design 是蚂蚁集团开源的企业级 React UI 组件库与设计语言，2015 年首发，服务中后台、数据密集场景。Design Token、Less/CSS-in-JS 主题与 ProComponents 布局体系，使其成为中国 B 端 Web 事实标准之一。

![Ant Design Logo](https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Ant_Design.svg/640px-Ant_Design.svg.png)

## 设计师与品牌

蚂蚁体验技术部维护；GitHub ant-design/ant-design 超 90k stars。Ant Design Pro、ProLayout、ProTable 提供脚手架级模板。5.x 起采用 CSS-in-JS 与 Design Token 算法主题；兼容 React 18+。姊妹项目 Ant Design Mobile、Ant Design Charts、Ant Design X（AI 对话 UI）。

## 设计亮点

组件覆盖 Form、Table、Tree、DatePicker 等 enterprise 高频；Form 与 rc-field-form 集成 validation。Design Token 支持 seed token → map token → alias token 三层，dark 算法一键切换。Table 虚拟滚动、column resize、嵌套 header 满足复杂报表。Icon 使用 @ant-design/icons。ConfigProvider 全局 locale、direction（RTL）与 component size。Accessibility 持续改进 focus 与 aria。

## 使用体验

`npm install antd` 后按需或全量引入；5.x 推荐 app.use() 与 theme={{ token: { colorPrimary } }} 定制品牌色。ProComponents 快速搭 admin dashboard，但 bundle 需 tree-shaking 与 lazy route。与 Tailwind 共存时常见 CSS 优先级冲突，需 ConfigProvider prefixCls 或 CSS layers。中文文档与社区 Stack Overflow 活跃，Issue 响应快。

## 文化影响

Ant Design 塑造中国 SaaS、金融、政务后台视觉：蓝主色、紧凑 table、卡片 filter。出海产品亦用其 rapid MVP。与 Element Plus、Arco Design 竞争 B 端市场。设计系统课程常以 Ant Design Token 讲解「算法主题」；Figma 社区有 Ant Design System Kit 便于设计 dev 对齐。

## 参考与延伸阅读

- [Ant Design 官方文档](https://ant.design/)
- [GitHub：ant-design/ant-design](https://github.com/ant-design/ant-design)
- [Ant Design Pro](https://pro.ant.design/)
