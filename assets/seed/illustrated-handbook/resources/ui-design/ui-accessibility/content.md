# 无障碍设计（Accessibility）

无障碍设计（a11y）确保数字产品可被**尽可能多的人**使用，包括视障、听障、运动障碍与认知差异用户。Web 内容无障碍指南 **WCAG** 与平台规范（Apple VoiceOver、Android TalkBack）定义了对比度、键盘导航、语义 markup 与辅助技术兼容的基准。

![国际通用无障碍标志（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Wheelchair_symbol.svg/240px-Wheelchair_symbol.svg.png)


从读者角度，把「标准书描述」与「真实饲养体验」对照着看，更容易判断自己是否适合该主题：时间投入、预算、空间与家庭成员（老人、幼儿、其他宠物）都会改变答案。以下内容在常识基础上稍作延展，便于形成 3–5 分钟可读完的完整印象。

## 背景与历史

1999 年 W3C 发布 WCAG 1.0；2008 年 WCAG 2.0 引入可感知、可操作、可理解、健壮（POUR）四原则；2018 年 WCAG 2.1 增加移动与低视力场景；欧盟 **EAA**、美国 **ADA** 等法规推动企业合规。苹果 2009 年 iPhone 3GS 起强化 VoiceOver；Material 与 Fluent 均内置 a11y 组件模式。

时间线与地域背景有助于理解它为何在特定年代走红，以及今日在收藏、实用或文化象征中的位置。


## UX 原则与产品影响

- **可感知**：文字对比度 ≥4.5:1（大文本 3:1）；图像需 alt；视频需字幕。
- **可操作**：全功能可键盘完成；焦点可见；避免仅依赖 hover 或复杂手势。
- **可理解**：错误提示清晰；表单 label 关联；动画可 `prefers-reduced-motion` 关闭。
- **健壮**：语义 HTML + ARIA 仅在必要时补充；屏幕阅读器测试纳入 QA。

无障碍不是「边缘功能」：curb cut effect 表明 caption、键盘 shortcut 等原为残障设计的功能往往惠及全体用户（如推婴儿车者也需要坡道）。

## 冷知识

- 「a11y」是 accessibility 的 numeronym：a + 11 字母 + y。
- `#000`  on `#fff` 并非总是最佳——纯黑对白可能引发 halation，WCAG 允许深灰。
- **axe DevTools** 等自动化只能捕获约 30–50% 问题，manual 测试仍不可替代。

趣闻应可核对来源；若仅流传于社群梗，建议标注为「说法之一」以免误作史实。


## 参考与延伸阅读

- [WCAG 2.2 概述（W3C）](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [WebAIM 对比度检查器](https://webaim.org/resources/contrastchecker/)
- [Apple HIG：Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
