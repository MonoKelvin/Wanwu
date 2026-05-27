# Bootstrap

Bootstrap 由 Twitter 前端 Mark Otto 与 Jacob Thornton 2011 年创建，是最广泛使用的 CSS/JS 前端框架之一。12 列 responsive grid、预制组件与 utility classes 降低 Web 原型与后台搭建门槛，v5.3 起内置 color modes（dark）与 RTL 支持。

![Bootstrap Logo](https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Bootstrap_logo.svg/640px-Bootstrap_logo.svg.png)

## 设计师与品牌

现由 Bootstrap Core Team 维护，MIT 许可；原 Twitter 开源项目。文档 bootstrap.dev 提供 examples 与 snippets。生态含 Bootstrap Icons、Bootswatch 主题、React-Bootstrap、Reactstrap、ng-bootstrap 等框架绑定。与 Tailwind 的 utility-first 形成路线对比。

## 设计亮点

Grid system 基于 flexbox：container → row → col-* breakpoint（xs–xxl）。组件含 navbar、modal、dropdown、carousel，依赖 Popper.js 定位。Sass 变量定制 primary color、spacing、border-radius。v5 移除 jQuery 依赖，纯 vanilla JS。Color modes 通过 data-bs-theme 切换 light/dark。Reboot 层 normalize 跨浏览器 baseline。

## 使用体验

CDN 一行引入即可原型；生产建议 npm + bundler tree-shake 未用 JS。Customization 通过 Sass maps 或 CSS variables（v5.2+）。学习曲线低，适合初学者与 internal tools。与 modern SPA 合用时，注意 global CSS 与 CSS modules 冲突。大型 design system 团队常从 Bootstrap 迁移到 Tailwind 或自建 token，但 Bootstrap 仍在 WordPress、admin template 市场占主导。

## 文化影响

Bootstrap 定义 2010 年代「蓝色 navbar + jumbotron」Web 审美；大量 startup landing 基于其 examples 修改。它降低 Web 门槛，也引发「Bootstrap 脸」同质化批评。教育领域仍是 HTML/CSS 课程默认 stack。与 Tailwind 争论代表「组件语义 vs 原子 utility」两派 UI 架构哲学。

## 参考与延伸阅读

- [Bootstrap 5.3 文档](https://getbootstrap.com/docs/5.3/getting-started/introduction/)
- [GitHub：twbs/bootstrap](https://github.com/twbs/bootstrap)
- [Bootstrap Icons](https://icons.getbootstrap.com/)
