# 闲读模块 — 详细设计（v1.2.5）

> **版本**：v1.2.5  
> **状态**：待评审  
> **日期**：2026-06-17  
> **需求文档**：[leisure-read-requirements-v1.2.5.md](../requirements/leisure-read-requirements-v1.2.5.md)

---

## 1. 设计目标

| 目标 | 说明 |
|------|------|
| 模块自治 | 代码集中在 `src/modules/library/leisure-read/` |
| 多 Provider | 每 Tab 有序 Provider 列表，**自动链式降级** |
| 免 Key 优先 | 默认链全部无需 Token；急转弯内置种子保底 |
| 中文默认 | 一言 / 急转弯 / 一文中文；笑话默认中文 |
| 侧栏极简 | 仅「闲读」单节点 |

---

## 2. 标识与路由

| 项 | 值 |
|----|-----|
| 模块 ID | `wanwu.leisure-read` |
| Major ID | `leisure-read` |
| 用户可见名 | **闲读** |
| 路由 | `/library/leisure-read` |

---

## 3. Provider 架构

### 3.1 接口

```typescript
interface IContentProvider {
  readonly id: string
  fetch(signal?: AbortSignal): Promise<LeisureReadContent>
}

interface IArticleProvider extends IContentProvider {
  fetchToday(signal?: AbortSignal): Promise<LeisureReadContent>
}
```

各 Tab 在 `domain/providerChains.ts` 声明默认顺序（可从设置覆盖，v2）。

### 3.2 链式执行（默认）

```
fetch(tab, settings)
  → resolveProviderList(tab, settings)   // 按语言/一文模式选链
  → for (provider of list)
       try return await provider.fetch()
       catch log & continue
  → throw LeisureReadFetchError('all_providers_failed')
```

- 单 Provider 超时建议：**8s**（可配置常量）
- 失败不弹多次 Toast，链末统一错误态 +「重试」
- **同一请求只采用一家结果**，不合并多源

### 3.3 可选：并行竞速（仅笑话 Tab，v2 考虑）

对延迟敏感时，可对中文笑话链前 N 家 `Promise.any` 取最快成功结果；v1.2.5 **仅用链式降级**，实现更简单。

### 3.4 默认链配置（与需求文档对齐）

```typescript
// domain/providerChains.ts
export const QUOTE_CHAIN = ['hitokoto', 'jinrishici', 'xxapi-yiyan', 'saintic-sentence'] as const

export const JOKE_CHAIN_ZH = ['vvhan-joke', 'timelessq-joke', 'brisk-joke'] as const
export const JOKE_CHAIN_EN = ['jokeapi-safe', 'official-joke-api', 'icanhazdadjoke'] as const

export const RIDDLE_CHAIN = ['vvhan-miyu', 'xxapi-miyu', 'local-riddle-seed'] as const

export const ARTICLE_CHAIN_RANDOM = ['meiriyiwen-random'] as const
export const ARTICLE_CHAIN_TODAY = ['meiriyiwen-today'] as const
```

```typescript
function resolveJokeChain(lang: LeisureReadJokeLang) {
  return lang === 'en' ? JOKE_CHAIN_EN : JOKE_CHAIN_ZH
}

function resolveArticleChain(mode: LeisureReadArticleMode) {
  return mode === 'today' ? ARTICLE_CHAIN_TODAY : ARTICLE_CHAIN_RANDOM
}
```

### 3.5 Provider 注册表

`providers/registry.ts` 将 ID 映射到实现类；新增 API 只需：

1. 在 `providers/` 增加实现文件  
2. 在 `registry` 注册  
3. 在 `providerChains` 调整顺序  

不改 UI 与 IPC 签名。

### 3.6 内置种子 `local-riddle-seed`

- 路径：`src/modules/library/leisure-read/assets/riddle-seed.json`
- 格式：`{ "question": string, "answer": string }[]`
- 逻辑：随机取一条，生成稳定 `contentId`（question 哈希）
- 无外网时急转弯 Tab 仍可演示

---

## 4. Provider 实现要点

| ID | 文件 | 归一逻辑 |
|----|------|----------|
| `hitokoto` | `hitokotoProvider.ts` | `body`←hitokoto，`footer`←from_who/from |
| `jinrishici` | `jinrishiciProvider.ts` | `body`←content，`footer`←author·origin |
| `xxapi-yiyan` | `xxapiYiyanProvider.ts` | `data` 字符串 → body |
| `saintic-sentence` | `sainticProvider.ts` | 解析 `data` 名句字段 |
| `vvhan-joke` | `vvhanJokeProvider.ts` | title + joke |
| `timelessq-joke` | `timelessqJokeProvider.ts` | data.content |
| `brisk-joke` | `briskJokeProvider.ts` | 纯文本 → body |
| `jokeapi-safe` | `jokeApiProvider.ts` | single/twopart 分支 |
| `official-joke-api` | `officialJokeProvider.ts` | setup/punchline |
| `icanhazdadjoke` | `icanhazdadjokeProvider.ts` | joke 字段 |
| `vvhan-miyu` | `vvhanMiyuProvider.ts` | question/answer 字段待对接时映射 |
| `local-riddle-seed` | `localRiddleSeedProvider.ts` | 读 JSON |
| `meiriyiwen-random` | `meiriyiwenProvider.ts` | random 端点 |
| `meiriyiwen-today` | `meiriyiwenProvider.ts` | today 端点 |

所有 HTTP Provider 在 **`electron/leisureReadService.ts`** 发起请求。

---

## 5. 设置模型

```typescript
export type LeisureReadJokeLang = 'zh' | 'en'
export type LeisureReadArticleMode = 'random' | 'today'

export const DEFAULT_LEISURE_READ_SETTINGS = {
  leisureReadJokeLang: 'zh',
  leisureReadArticleMode: 'random'
} as const
```

**设置 → 全库 → 闲读** 仅两项（v1.2.5）：

| 设置 | 默认 | 影响 |
|------|------|------|
| 冷笑话语言 | 中文 | `resolveJokeChain` |
| 每日一文 | 随机 | `resolveArticleChain` |

不在设置中暴露 Provider 顺序；后续可加「高级」折叠区。

---

## 6. 目录结构

```
src/modules/library/leisure-read/
├── app/
├── domain/
│   ├── types.ts
│   ├── routes.ts
│   ├── settings.ts
│   └── providerChains.ts
├── providers/
│   ├── registry.ts
│   ├── providerChain.ts
│   └── *.ts                    # 各 Provider 实现
├── assets/
│   └── riddle-seed.json
├── electron/
├── services/
├── settings/
├── views/
├── components/
└── styles/
```

---

## 7. 全库接入

- `registerLibraryMajor({ id: 'leisure-read', name: '闲读', order: 0 })`
- `buildSectionTree: () => []` — **仅单节点**
- QuickAccess：`kind: 'leisure-read'`，仅搜收藏

---

## 8. UI / 交互（摘要）

- 主区 Tab + 玻璃卡片 + 工具栏（收藏 / 复制 / 下一条 / 我的收藏）
- 冷笑话语言、一文模式**仅在设置页**
- 失败态展示「当前内容源暂时不可用，已尝试切换备用线路」+ 重试

---

## 9. IPC

| Channel | 说明 |
|---------|------|
| `leisureRead:fetch` | `{ tab }`；内部读 settings 选链 |
| `leisureRead:favorite*` | 收藏 CRUD / 搜索 |

---

## 10. 实现阶段

| 阶段 | 内容 |
|------|------|
| P0 | 注册 + quote/joke 链（hitokoto + vvhan/jokeapi）+ 设置 |
| P1 | riddle 链 + `riddle-seed` + article 链 + 收藏 |
| P2 | 补全备用 Provider + 全局搜索 + 动效 |
| P3 | 并行竞速、可配置链顺序、需 Key 源扩展 |

---

## 11. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.2.5 | 2026-06-17 | 多 Provider 链设计；免 Key API 清单；内置急转弯种子；文档命名规范 |
