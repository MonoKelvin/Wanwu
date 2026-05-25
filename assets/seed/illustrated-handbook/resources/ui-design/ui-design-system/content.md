# 设计系统（Design System）

设计系统（Design System）是产品团队共享的**视觉、交互与代码规范集合**，通常包含 Design Token、组件库、文档站点、Figma 库与贡献流程。它把「界面怎么做」从个人审美变成可版本化、可测试的组织资产，支撑多产品、多平台的一致体验。

![Figma 标志（设计系统常用协作工具，维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Figma-logo.svg/320px-Figma-logo.svg.png)


从读者角度，把「标准书描述」与「真实饲养体验」对照着看，更容易判断自己是否适合该主题：时间投入、预算、空间与家庭成员（老人、幼儿、其他宠物）都会改变答案。以下内容在常识基础上稍作延展，便于形成 3–5 分钟可读完的完整印象。

## 背景与历史

Brad Frost 2013 年提出 **Atomic Design**（原子→分子→ organism）为组件分层提供词汇；Google Material（2014）、Apple HIG、IBM Carbon、Salesforce Lightning 等推动大厂系统化。2010 年代中后期，Shopify Polaris、GitHub Primer、Atlassian Design System 开源，Storybook 成为文档载体；近年 Token Studio、Style Dictionary 等打通 Figma → code 管道。

时间线与地域背景有助于理解它为何在特定年代走红，以及今日在收藏、实用或文化象征中的位置。


## UX 原则与产品影响

- **一致性**：用户跨 Web/App 认得出品牌与交互模式，降低学习成本。
- **效率**：复用 Button、Input 而非每项目重画，设计—开发 handoff 缩短。
- **质量**：集中修复 a11y bug、国际化与导航一次惠及全部产品。
- **治理**：RFC、deprecation 策略与 semver 避免「野生 fork」失控。

成熟设计系统不仅是 UI kit，还包含**内容语调、 motion 原则、数据可视化色板**与 usage do/don't。

## 冷知识

- 「设计系统」与「样式指南 Style Guide」常被混用；前者强调可运行代码与流程，后者偏静态 PDF。
- 许多系统以 **「.design」域名** 对外发布（如 primer.style、polaris.shopify.com）。
- 设计系统团队（DS team）常采用「联邦模型」：中心维护 core，各产品线贡献 domain 组件。

趣闻应可核对来源；若仅流传于社群梗，建议标注为「说法之一」以免误作史实。


## 参考与延伸阅读

- [Design Systems Repo](https://designsystemsrepo.com/)
- [Brad Frost：Atomic Design](https://atomicdesign.bradfrost.com/)
- [Nathan Curtis：Design Systems 文章集](https://medium.com/eightshapes-llc/tagged/design-systems)
