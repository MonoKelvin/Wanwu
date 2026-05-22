# Windows 安装包（预留）

下一版本使用 **Inno Setup** 生成安装程序。

建议流程：

1. `npm run build`
3. 使用 `wanwu.iss`（待添加）编译 `.exe` 安装包

应用运行时从 `assets/packed/library-data-pack.zip` 解压图鉴数据库，无需在安装程序内重复入库。
