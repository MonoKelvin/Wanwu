# Notion 风格

Notion 风格指受 Notion 影响的 productivity UI 美学：高 whitespace、灰阶 typography hierarchy、block-based content、sidebar tree 导航与 subtle border card。代表产品含 Notion 本身、Craft、AppFlowy 及部分 SaaS docs 模块。

![Notion 风格文档界面](https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Notion-logo.svg/640px-Notion-logo.svg.png)

## 设计师与品牌

Notion Labs 定义 category；开源 clone AppFlowy、AFFiNE 延续 visual language。Tailwind UI、Catalyst 模板含 similar doc layout。Font stack 常用 inter、system-ui；icon 线性 stroke 1.5px。

## 设计亮点

Canvas：max-width ~900px centered column，title 40px+ bold。Sidebar：240px fixed，hover reveal on mobile。Block hover 显示 ⋮⋮ handle 与 + insert。Database card view 缩略 cover image + property pill。Color accent 极少，靠 weight 与 spacing 分区。Dark mode 背景 #191919 非纯黑。Minimal icon：emoji cover 个性化。

## 使用体验

Replication：CSS grid sidebar + main；TipTap/ProseMirror editor 实现 block。Slash menu `@tiptap/suggestion`。Performance 大 doc virtualize block list。Localization CJK 行高需 +0.1。Brand 差异化：在 Notion 骨架上加 accent color、custom font 避免 generic。

## 文化影响

「Notion aesthetic」渗透 indie SaaS landing 与 YC demo day slide。批评：convergence 致 boring sameness；辩护：readability 优先。中国语雀、飞书知识库在信息架构借鉴 block，视觉保留本土 enterprise 色。UI trend 周期或向 richer visual（Linear bold color）摆动。

## 参考与延伸阅读

- [Notion 官方](https://www.notion.so/)
- [AppFlowy 开源](https://appflowy.io/)
- [TipTap Editor](https://tiptap.dev/)
