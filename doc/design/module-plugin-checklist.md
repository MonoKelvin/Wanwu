# 新增模块速查 Checklist

> 完整说明见 [module-plugin-architecture.md](./module-plugin-architecture.md)

## 1. 脚手架

- [ ] `src/modules/<name>/domain/moduleId.ts`
- [ ] `src/modules/<name>/app/register.ts`
- [ ] `src/modules/<name>/domain/wanwuApi.ts`

## 2. 渲染层

- [ ] `*AppModule.ts` 实现 `IAppModule`
- [ ] 路由 + 导航项
- [ ] （可选）设置分区 `settings/*.vue`
- [ ] （可选）QuickAccess kind + 打开逻辑
- [ ] （可选）文库 major / catalog contributor

## 3. 主进程（有 IPC / DB / 托盘时）

- [ ] `main/register.ts`
- [ ] `*MainModule.ts` 实现 `IMainProcessModule`
- [ ] `initServices` → `setModuleRuntimeService`
- [ ] `registerIpcHandlers`
- [ ] `getPreloadApi`
- [ ] （可选）`registerDatabaseSchema`（user.sqlite）
- [ ] （可选）`registerRssDatabaseSchema`（rss.sqlite 等独立库）
- [ ] （可选）`searchQuickAccess` / `getTrayStatusSlice`
- [ ] （可选）`onModulesReady` 处理跨模块依赖
- [ ] （可选）`onDispose`

## 4. 设置迁移

- [ ] 模块专属字段写入 `moduleSettings[moduleId]`
- [ ] `normalizeAppSettings` 增加旧字段迁移

## 5. 验证

```bash
npm run check:mechanisms
node scripts/electron-vite.mjs build
# 临时重命名 src/modules/<name> 后重复上述命令
```

## 6. 禁止

- 在 `electron/main.ts` / `preload.ts` 硬编码本模块
- 在 `src/app/`、`src/shared/` 直接 `import '@modules/<name>/...'`（bootstrap 白名单除外）
- 新增 `electron/ipc/domains/<name>Handlers.ts`
