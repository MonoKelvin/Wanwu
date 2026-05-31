# 酷狗音乐 API 参考（Wanwu 集成摘要）

> 完整文档：[酷狗音乐 NodeJS 版 API](https://kugoumusicapi-docs.4everland.app/#/?id=%e9%85%b7%e7%8b%97%e9%9f%b3%e4%b9%90-api)  
> npm 包：`kugoumusicapi`（见 `package.json`）

## 调用前须知

1. **设备注册（必须）**：播放 `/song/url`、搜索 `/search` 前需先调用 **`/register/dev`** 获取 `dfid`，并持久化 `KUGOU_API_GUID`、`KUGOU_API_MID`。
2. **匿名 Cookie**：未登录时 Cookie 需包含 `userid=0`、`token=`（空字符串），否则搜索易返回 `error_code: 152`。
3. **登录 Cookie**：登录成功后写入 `token`、`userid`；与设备字段一并传给各接口。
4. 不要频繁调用登录接口，避免风控。

## Wanwu 已对接的核心接口

| 能力 | API path | 模块函数 |
|------|----------|----------|
| 设备注册 | `/register/dev` | `register_dev` |
| 搜索 | `/search` | `search` |
| 综合搜索 fallback | `/search/complex` | `search_complex` |
| 热搜 | `/search/hot` | `search_hot` |
| 搜索建议 | `/search/suggest` | `search_suggest` |
| 播放 URL | `/song/url` | `song_url` |
| 歌词搜索 + 歌词 | `/search/lyric` + `/lyric` | `search_lyric`, `lyric` |
| 每日推荐 | `/everyday/recommend` | `everyday_recommend` |
| 风格推荐 | `/everyday/style/recommend` | `everyday_style_recommend` |
| 新歌 | `/top/song` | `top_song` |
| 排行榜列表 | `/rank/list` | `rank_list` |
| 排行榜歌曲 | `/rank/audio` | `rank_audio` |
| 热门歌单 | `/top/playlist` → `data.special_list` | `top_playlist` |
| 主题歌单 | `/theme/playlist` | `theme_playlist` |
| 歌单歌曲 | `/playlist/track/all` | `playlist_track_all` |
| 歌曲推荐卡片 | `/top/card` | `top_card` |
| 推荐歌曲 | `/recommend/songs` | `recommend_songs` |
| 扫码登录 | `/login/qr/key` 等 | `login_qr_*` |

## 响应结构注意

- `song/url` 成功时 **`url` 为字符串数组**，位于 body 顶层（不一定有 `data` 包装）。
- `top/playlist` 列表在 **`data.special_list`**，字段含 `specialid`、`specialname`。
- `top/song` 的 `data` 为**歌曲数组**（不是 `data.info`）。
- `search` 结果常用 `OriSongName`、`Audioid`、`HQ.Hash` 等字段。
- `search/complex` 可能返回 HTML 包裹 JSON，需提取 `{ ... }` 再解析。

## 本地实现位置

- 设备与会话：`electron/services/music/platform/kugou/kugouDevice.ts`、`sessionStore.ts`
- 平台服务：`electron/services/music/platform/kugou/kugouPlatformService.ts`
- 字段映射：`electron/services/music/platform/kugou/mapper.ts`
- 流地址解析：`electron/services/music/platform/kugou/kugouResponse.ts`
