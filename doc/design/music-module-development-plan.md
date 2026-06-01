# 音乐模块开发计划（实现摘要）

## 模块位置

侧栏顺序：全库 → RSS → **音乐** → 个人 → 设置。

## 主数据源

- **默认主源**：酷狗（内嵌 KuGouMusicApi，`musicPrimarySource: kugou`）
- **平台抽象**：`electron/services/music/platform/` — 酷狗 vendor + 网易云 `@neteasecloudmusicapienhanced/api`
- **备用**：Verome（`musicPrimarySource: verome`）、Jamendo、Audius
- **元数据**：酷我/iTunes 封面与歌词补全

## Provider 架构

| 组件 | 职责 |
|------|------|
| `platform/MusicPlatformManager.ts` | 网易云 / 酷狗平台选择与配置 |
| `platform/netease/` | Session、Mapper、PlatformService |
| `providers/neteaseProvider.ts` | 流解析注册到 `MusicProviderRegistry` |
| `MusicService.ts` | 组合根：发现、搜索、登录 IPC、播放 |

播放：`music:resolveStream` → netease 直连 `/song/url/v1`，不再 promote 到 Verome。

## 发现页 API 映射（网易云主源）

| UI 区块 | IPC | 网易云 API |
|--------|-----|------------|
| 为你推荐 | `music:getDiscoverSection` | 私人 FM / 日推 |
| 热门趋势 | 同上 | 日推 / FM |
| 新上线 | 同上 | `/top/song` |
| 精选榜单 | 同上 | `/toplist/detail` + `/top/playlist` |
| 分类 | `music:getMoods` | `/playlist/catlist` |

## 登录与账号

- IPC（平台通用）：`music:getPlatformUserProfile` / `getPlatformLoginStatus` / `refreshPlatformLogin` / `getPlatformSessionSnapshot`
- IPC（库）：`getPlatformUserPlaylists` / `getPlatformLikedTracks` / `getPlatformUserCloud` / `getPlatformSubscribed`
- IPC（兼容）：`music:neteaseLoginQr*`、`music:kugouLoginQr*` 等仍保留
- Session：`{wanwu}/db/netease-session.json`、`{wanwu}/db/kugou-session.json`（3 天自动 refresh）
- UI：`MusicPlatformLoginDialog.vue`、设置页、`MusicMineView` + `MusicProfileHero`

## 平台门面 IPC（随 musicPrimarySource）

主源为酷狗/网易云时，下列能力走 `primaryPlatform()`；Verome 主源时搜索辅助返回空，日推/FM 等走 Verome 聚合。

| IPC | 说明 | 兼容 alias |
|-----|------|------------|
| `music:searchHot` | 搜索热搜 | `music:neteaseSearchHot` |
| `music:searchSuggest` | 搜索建议 | `music:neteaseSearchSuggest` |
| `music:searchDefault` | 搜索默认词 | `music:neteaseSearchDefault` |
| `music:getDailyRecommend` | 日推 | — |
| `music:getPersonalFm` | 私人 FM | — |
| `music:trashPersonalFm` | FM 垃圾桶 | — |
| `music:getPlatformLoginStatus` | 登录状态 | 替代设置页分支调用 |
| `music:getNeteaseUserPlaylists` 等 | 用户库 | 内部转调 `getPlatform*` |

前端：`useMusicPlatform()` — `buildBrowseId` / `resolvePlaylistBrowseId` / `platformLabel`；browseId 约定 `kugou:*` / `netease:*`。

UI shell：`.ww-music-shell` + `music-controls.css`（pill SelectButton、glass 列表面板、同心圆角 token）。

## 「我的」页（MusicMineView）

- 资料头图：头像、昵称、签名、等级、VIP、统计（喜欢/歌单/歌手/专辑）
- Tab：**喜欢** | **歌单**（创建/收藏） | **收藏**（专辑/歌手/视频/播客） | **云盘** | **本地**（收藏/历史）
- 主源为 Verome 时仅展示本地 Tab
- 前端：`useMusicAccount`（模块级共享状态）、`music-mine.css`

### 平台能力矩阵

| 能力 | 网易云 | 酷狗 |
|------|--------|------|
| 资料 user/detail + subcount | 是 | 是（VIP 可选） |
| 喜欢歌曲 | likelist | 「我喜欢」歌单 |
| 歌单 | user/playlist | user/playlist |
| 云盘 | user/cloud | user/cloud |
| 收藏专辑 | album/sublist | 暂不支持 |
| 收藏歌手 | artist/sublist | user/follow |
| 收藏视频 | mv/sublist | user/video/collect |
| 收藏播客 | dj/sublist | 暂不支持 |

## 本地数据

| 内容 | 路径 |
|------|------|
| 音乐库 | `{wanwu}/db/music.sqlite` |
| 网易云会话 | `{wanwu}/db/netease-session.json` |
| 音频缓存 | `{wanwu}/music/cache/audio/` |

缓存 key：`{provider}:{id}.mp3`（如 `netease:123456.mp3`）。

## 路由扩展

- `music-playlist/:playlistId` — 歌单详情
- `music-daily` — 日推
- `music-fm` — 私人 FM
- `music-charts` / `music-toplist/:browseId` — 排行榜
- `music-new` — 新歌新碟
- `music-artists` — 歌手浏览
- `music-radio` / `music-radio/:categoryId` — 场景电台
- `music-video/:browseId` — MV
- `music-cloud` — 云盘

## 平台 IPC（统一登录）

- `music:platformLoginQrKey` / `Check` / `SendCaptcha` / `LoginPhone` / `LoginCookie` / `Logout`
- `music:platformLikeSong` — 平台喜欢同步
- 旧 `netease*` / `kugou*` 登录 IPC 保留兼容，UI 统一走 platform 门面

## 酷狗（默认主源）

内嵌 [KuGouMusicApi](https://github.com/MakcRe/KuGouMusicApi) v1.5.1（`npm install` → `node_modules/kugoumusicapi`，vendor 目录已 gitignore）。

## 网易云（可选主源）

内嵌 [@neteasecloudmusicapienhanced/api](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)；设置中切换 `musicPrimarySource: netease`。

## 酷狗同步

v1 **不做**逆向客户端同步；仅 API 层抽象预留。
