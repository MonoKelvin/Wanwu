# Ant Design

Ant Design（antd）是蚂蚁集团开源的企业级 React UI 组件库与设计语言，2015 年随阿里中台战略发布。它以**数据密集型后台**场景为核心，提供 Table、Form、DatePicker、ProLayout 等高频 B 端组件，是国内 SaaS 与金融、政务系统的视觉基准之一。

![React 标志（Ant Design 基于 React，维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/320px-React-icon.svg.png)


从读者角度，把「标准书描述」与「真实饲养体验」对照着看，更容易判断自己是否适合该主题：时间投入、预算、空间与家庭成员（老人、幼儿、其他宠物）都会改变答案。以下内容在常识基础上稍作延展，便于形成 3–5 分钟可读完的完整印象。

## 背景与历史

Ant Design 1.x 确立蓝白主色与 8px 栅格；2.x 引入国际化；3.x 强化 Form 与 Icon；4.x 重写 CSS-in-JS 与 Design Token；5.x 支持 React 18、CSS Variables 主题与更灵活的 ConfigProvider。姊妹项目 **Ant Design Pro**、**ProComponents** 提供脚手架与高级表格/表单，形成完整 B 端解决方案。

时间线与地域背景有助于理解它为何在特定年代走红，以及今日在收藏、实用或文化象征中的位置。


## UX 原则与产品影响

- **信息密度**：表格筛选、批量操作、分页与导出是 first-class 交互，适合运营与风控后台。
- **一致性**：组件 API 命名（`onChange`、`value`）与尺寸（`small`/`middle`/`large`）统一，降低学习成本。
- **国际化**：内置 zh-CN、en-US 等 locale，DatePicker 等需处理时区与格式。
- **无障碍**：持续改进键盘导航与 ARIA，但复杂 Table 仍需谨慎测试屏幕阅读器。

Ant Design 的设计语言也影响 Vue 版 **Ant Design Vue** 与移动端 **Ant Design Mobile**，构成跨框架家族。

## 冷知识

- 「Ant」既指蚂蚁，也暗合「Atomic」组件化理念；Logo 中的蚂蚁形象深入人心。
- 4.0 起设计团队发布 **Ant Design 设计语言文档**，单独阐述价值观与布局原则。
- 许多中国互联网公司内部 fork antd 主题，仅改 primary color 即形成「自家设计系统」。

趣闻应可核对来源；若仅流传于社群梗，建议标注为「说法之一」以免误作史实。


## 参考与延伸阅读

- [Ant Design 官网](https://ant.design/)
- [Ant Design GitHub](https://github.com/ant-design/ant-design)
- [ProComponents 文档](https://procomponents.ant.design/)
