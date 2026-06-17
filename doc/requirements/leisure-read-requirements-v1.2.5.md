# 闲读模块 — 需求与资源说明（v1.2.5）

> **版本**：v1.2.5  
> **状态**：需求已定稿  
> **日期**：2026-06-17  
> **关联设计**：[leisure-read-detailed-design-v1.2.5.md](../design/leisure-read-detailed-design-v1.2.5.md)

---

## 1. 产品定位

**闲读**是全库（Library）下的独立大分类，位于**便笺之上**。侧栏**仅一个「闲读」节点**。主界面内通过 Tab 切换四种轻阅读内容。

| 原则 | 说明 |
|------|------|
| 独立 | 四个 Tab 各自可替换数据源，互不耦合 |
| 轻量 | 阅读 → 下一条 → 收藏 / 复制 |
| 本地优先 | 收藏落本地；全局搜索**仅检索本模块收藏** |
| 中文优先 | 默认中文内容；冷笑话可在全库设置中切英文 |
| 多源容错 | 每 Tab 配置**多套免 Key API**，链式降级；必要时内置离线种子保底 |

### 已确认决策

| 项 | 决策 |
|----|------|
| 模块中文名 | **闲读** |
| 侧栏 | **仅一个「闲读」节点** |
| 冷笑话 | 全库设置中/英切换，**默认中文** |
| 每日一文 | **默认随机**；设置可切「今日」 |

---

## 2. 四个 Tab

| Tab ID | 名称 | 体验摘要 |
|--------|------|----------|
| `quote` | 每日一言 | 随机中文短句 + 出处 |
| `joke` | 冷笑话 | 默认中文；设置可切英文 |
| `riddle` | 脑筋急转弯 | 中文问答，点击揭晓答案 |
| `article` | 每日一文 | 默认**随机**美文 |

---

## 3. 功能需求（摘要）

- Tab 切换、下一条、收藏、复制、深浅色适配
- **设置 → 全库 → 闲读**：冷笑话语言（中文/英文）、每日一文模式（随机/今日）
- 收藏仅本模块；全局搜索仅搜收藏
- 第三方请求走 Electron 主进程代理

---

## 4. 数据源策略：多 Provider 链

### 4.1 原则

1. **优先免 Key / 免 Token** 的公开 HTTP API（HTTPS 优先）。
2. 每个 Tab 配置 **Provider 有序列表**：按顺序请求，失败则自动切换下一家（超时、非 2xx、解析失败均视为失败）。
3. **不并行混用内容**：同一时刻只展示一家 Provider 返回的结果；链式降级，不做多源拼接。
4. **脑筋急转弯**因公开免 Key 中文源较少，链末保留 **模块内置 JSON 种子** 作为保底（实现阶段打包，不依赖外网）。
5. 需 Key 的商用 API（天聚数行、极速数据等）**不纳入 v1.2.5 默认链**，仅作后续扩展备注。

### 4.2 默认 Provider 链（v1.2.5 推荐）

#### 每日一言 `quote`（中文）

| 顺序 | Provider ID | 请求 | 鉴权 | 说明 |
|------|-------------|------|------|------|
| 1 | `hitokoto` | `GET https://v1.hitokoto.cn/?encode=json` | 无 | 一言官方；字段 `hitokoto` / `from` / `from_who`；[文档](https://developer.hitokoto.cn/sentence/) |
| 2 | `jinrishici` | `GET https://v1.jinrishici.com/all.json` | 无 | 古诗词随机句；`content` / `author` / `origin`；[文档](http://gushi.ci/) |
| 3 | `xxapi-yiyan` | `GET https://v2.xxapi.cn/api/yiyan?type=hitokoto` | 无 | 聚合一言；`data` 为正文；可改 `type=poetry` 作诗词备选；[文档](https://xxapi.cn/doc/yiyan) |
| 4 | `saintic-sentence` | `GET https://hub.saintic.com/openservice/sentence/all.json` | 无 | 古诗文名句；`data` 为名句对象；[文档](https://docs.saintic.com/open/sentence.html) |

#### 冷笑话 `joke` — 中文（默认）

| 顺序 | Provider ID | 请求 | 鉴权 | 说明 |
|------|-------------|------|------|------|
| 1 | `vvhan-joke` | `GET https://api.vvhan.com/api/joke?type=json` | 无 | JSON：`title` + `joke`；[文档](https://api.aa1.cn/doc/suijixiaohua.html) |
| 2 | `timelessq-joke` | `GET https://api.timelessq.com/joke` | 无 | JSON：`data.content`；可选 query `type` / `level`；[文档](https://s.apifox.cn/faff130e-7aa3-42da-9f93-574b16c8acda/api-292895677) |
| 3 | `brisk-joke` | `GET http://brisk.eu.org/api/joke.php` | 无 | **纯文本**；需主进程代理（HTTP）；用户曾验证可用 |
| 4 | `tmini-joke` | `GET https://www.tmini.net/api/...`（以平台文档为准） | 无 | 冷笑话聚合；宣称免费 60 次/分钟；[文档](https://www.tmini.net/apidata?id=25) |

#### 冷笑话 `joke` — 英文（设置切换后）

| 顺序 | Provider ID | 请求 | 鉴权 | 说明 |
|------|-------------|------|------|------|
| 1 | `jokeapi-safe` | `GET https://v2.jokeapi.dev/joke/Any?lang=en&safe-mode` | 无 | 推荐加 `blacklistFlags=nsfw,religious,political,racist,sexist,explicit`；限流约 120 次/分钟；[文档](https://v2.jokeapi.dev/) |
| 2 | `official-joke-api` | `GET https://official-joke-api.appspot.com/random_joke` | 无 | `setup` + `punchline`；[文档](https://openpublicapis.com/api/jokes-api) |
| 3 | `icanhazdadjoke` | `GET https://icanhazdadjoke.com/` + `Accept: application/json` | 无 | 单段英文 dad joke；[文档](https://icanhazdadjoke.com/api) |

#### 脑筋急转弯 `riddle`（中文）

| 顺序 | Provider ID | 请求 | 鉴权 | 说明 |
|------|-------------|------|------|------|
| 1 | `vvhan-miyu` | `GET https://api.vvhan.com/api/miyu` | 无 | 社区常用谜语/急转弯类接口（**待接入时确认字段**） |
| 2 | `xxapi-miyu` | `GET https://v2.xxapi.cn/api/miyu`（若平台仍提供） | 无 | XXAPI 谜语类（**待确认路径**） |
| 3 | `local-riddle-seed` | 读模块内 `assets/riddle-seed.json` | — | **内置保底**；本地随机一条；无外网亦可展示 |

> 说明：公开、稳定、免 Key 的**中文脑筋急转弯** API 较少；v1.2.5 以「外网候选 + 内置种子」组合，避免单点故障导致 Tab 不可用。

#### 每日一文 `article`

| 模式 | 顺序 | Provider ID | 请求 | 鉴权 |
|------|------|-------------|------|------|
| **随机（默认）** | 1 | `meiriyiwen-random` | `GET https://interface.meiriyiwen.com/article/random?dev=1` | 无 |
| 今日（设置） | 1 | `meiriyiwen-today` | `GET https://interface.meiriyiwen.com/article/today?dev=1` | 无 |

返回字段（两接口一致）：`title`、`author`、`digest`、`content`、`wc` 等；[社区文档](https://github.com/shichunlei/-Api/blob/master/OneArticle.md)。

---

## 5. 各 API 返回要点（归一参考）

### 5.1 一言 Hitokoto

```json
{
  "hitokoto": "造物无言却有情，每于寒尽觉春生。",
  "from": "新雷",
  "from_who": "张维屏",
  "type": "i"
}
```

→ `body=hitokoto`，`footer=from_who · from`

### 5.2 古诗词 jinrishici

```json
{
  "content": "痴儿不知父子礼，叫怒索饭啼门东。",
  "origin": "百忧集行",
  "author": "杜甫"
}
```

→ `body=content`，`footer=author · origin`

### 5.3 JokeAPI（英文）

```json
{
  "type": "twopart",
  "setup": "Why are cats so good at video games?",
  "delivery": "They have nine lives.",
  "safe": true
}
```

→ `subtitle=setup`，`body=delivery`

### 5.4 韩小韩笑话 vvhan

```json
{
  "success": true,
  "title": "标题",
  "joke": "正文..."
}
```

### 5.5 每日一文 meiriyiwen

`title`、`author`、`digest`、`content`（HTML 正文，展示前需清洗）

---

## 6. 不纳入默认链的 API（需 Key / 不稳定 / 非目标）

| 来源 | 原因 |
|------|------|
| 天聚数行 TianAPI | 需 `apiKey`，有日限额 |
| 极速数据 jisuapi | 需 `appkey` |
| ALAPI / ShowAPI | 需 Token / AppKey |
| 起零数据 istero | 需 Bearer Token |
| ThinkAPI / 聚合数据 | 需 appCode / Key |

可在 v2 通过「设置 → 闲读 → 高级数据源」扩展，**v1.2.5 不实现**。

---

## 7. 接入前验证清单（实现阶段）

- [ ] 主进程逐个探测默认链可用性与响应时间
- [ ] `brisk` HTTP 代理与编码（纯文本）
- [ ] `vvhan` / `meiriyiwen` 近期可用性
- [ ] JokeAPI 429 降级文案
- [ ] 服务条款与桌面端合规（Hitokoto、jinrishici、meiriyiwen）
- [ ] 内置 `riddle-seed.json` 条数与版权（选用公有领域或自建内容）

---

## 8. 参考链接

| 类型 | URL |
|------|-----|
| 一言 | https://v1.hitokoto.cn/ |
| 一言文档 | https://developer.hitokoto.cn/sentence/ |
| 古诗词 | https://v1.jinrishici.com/all.json |
| XXAPI 一言 | https://v2.xxapi.cn/api/yiyan |
| 中文笑话 vvhan | https://api.vvhan.com/api/joke?type=json |
| 中文笑话 brisk | http://brisk.eu.org/api/joke.php |
| 英文笑话 JokeAPI | https://v2.jokeapi.dev/joke/Any?lang=en&safe-mode |
| 一文随机 | https://interface.meiriyiwen.com/article/random?dev=1 |
| 一文今日 | https://interface.meiriyiwen.com/article/today?dev=1 |
| SaintIC 名句 | https://hub.saintic.com/openservice/sentence/all.json |

---

## 9. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.2.5 | 2026-06-17 | 多 Provider 免 Key 资源整理；命名规范；一文默认随机；全中文默认 |
