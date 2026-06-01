# 酷狗音乐 API 参考（Wanwu 集成摘要）

> 完整文档：[酷狗音乐 NodeJS 版 API](https://kugoumusicapi-docs.4everland.app/#/?id=%e9%85%b7%e7%8b%97%e9%9f%b3%e4%b9%90-api)  
> npm 包：`kugoumusicapi@1.5.1`（见 `package.json`）

## 调用前须知

1. **设备注册（必须）**：播放 `/song/url`、搜索 `/search` 前需先调用 **`/register/dev`** 获取 `dfid`，并持久化 `KUGOU_API_GUID`、`KUGOU_API_MID`。
2. **匿名 Cookie**：未登录时 Cookie 需包含 `userid=0`、`token=`（空字符串），否则搜索易返回 `error_code: 152`。
3. **登录 Cookie 持久化（必须）**：登录成功后须**完整保存**接口返回的 Cookie（`token`、`userid`、`t1`、`vip_token` 等），后续请求携带同一 Cookie 维持会话；**勿重复调用登录接口**，否则易触发风控甚至封号。参考 [KuGouMusicApi #161](https://github.com/MakcRe/KuGouMusicApi/issues/161)。
4. **Token 续期**：已登录时通过 `/login/token` 刷新 token，并合并响应 Cookie 写回本地。
5. 登录态校验：`/user/detail` 返回 `status === 1` 表示仍有效。
6. **私人 FM**：优先 `personal_fm`（action: `play` / `garbage`），失败时 fallback `fm/recommend`、`fm/songs`。

## Wanwu 已对接

| 能力 | API path | 模块函数 |
|------|----------|----------|
| 设备注册 | `/register/dev` | `register_dev` |
| 搜索 / 综合搜索 | `/search`、`/search/complex` | `search`、`search_complex` |
| 热搜 / 建议 / 默认词 | `/search/hot` 等 | `search_hot`、`search_suggest`、`search_default` |
| 播放 URL | `/song/url`、`/song/url/new` | `song_url`、`song_url_new` |
| 歌词 | `/search/lyric` + `/lyric` | `search_lyric`、`lyric` |
| 每日推荐 / 风格推荐 | `/everyday/recommend` 等 | `everyday_recommend`、`everyday_style_recommend` |
| 私人 FM | `/v2/personal_recommend` 等 | `personal_fm`、`fm_recommend`、`fm_songs` |
| 新歌 / 排行榜 | `/top/song`、`/rank/list`、`/rank/audio` | `top_song`、`rank_list`、`rank_audio` |
| 歌单 | `/top/playlist`、`/playlist/track/all` 等 | `top_playlist`、`playlist_track_all` |
| 登录 | `/login/qr/*`、`/login/cellphone` 等 | `login_qr_*`、`login_cellphone` |
| 喜欢（歌单增删） | `/cloudlist.service/v6/add_song` 等 | `playlist_tracks_add`、`playlist_tracks_del` |
| 歌单 CRUD | `/cloudlist.service/v5/add_list` 等 | `playlist_add`、`playlist_del` |
| 用户库 | `/user/playlist`、`/user/cloud` 等 | `user_playlist`、`user_cloud` |
| 云盘 URL | `/bsstrackercdngz/v2/query_musicclound_url` | `user_cloud_url` |
| 评论 | `/mcomment/v1/cmtlist` | `comment_music` |
| MV | `/v1/video`、`/kmr/audio/mv` | `video_detail`、`kmr_audio_mv` |
| 场景电台 | `/scene/v1/scene/list_v2` 等 | `scene_module`、`scene_music` |
| 关注歌手 | `/followservice/v3/follow_singer` | `artist_follow`、`artist_unfollow` |

## 待对接 / 可选

| 能力 | 模块 | 说明 |
|------|------|------|
| 云盘上传 | — | 官方 API 未稳定暴露，UI 暂标记 `cloudUpload: false` |
| 收藏专辑 | — | 酷狗 capabilities 暂不支持 subscribedAlbums |
| 播客 | — | subscribedDjs: false |

## 平台差异（酷狗 vs 网易云）

| 能力 | 酷狗 | 网易云 |
|------|------|--------|
| 喜欢歌曲 | 「我喜欢」歌单 + playlist_tracks_add/del | `/like` API |
| 私人 FM trash | personal_fm action=garbage | `/fm_trash` |
| 云盘播流 | user_cloud_url | user/cloud/download |
| 场景电台 | scene_* | dj/program/byradio |
| browseId | `kugou:playlist:{globalId}` | `netease:playlist:{id}` |

## 响应结构注意

- `song/url` 成功时 **`url` 为字符串数组**，位于 body 顶层（不一定有 `data` 包装）。
- `top/playlist` 列表在 **`data.special_list`**，字段含 `specialid`、`specialname`。
- `top/song` 的 `data` 为**歌曲数组**（不是 `data.info`）。
- `search/complex` 可能返回 HTML 包裹 JSON，需提取 `{ ... }` 再解析。
- 歌单增删需 **`listid`**（内部 ID），播放列表用 **`global_collection_id`**。

## 本地实现位置

- 设备与会话：`electron/services/music/platform/kugou/kugouDevice.ts`、`kugouCookie.ts`、`kugouInvoke.ts`、`sessionStore.ts`
- 平台服务：`electron/services/music/platform/kugou/kugouPlatformService.ts`
- 字段映射：`electron/services/music/platform/kugou/mapper.ts`
- 流地址解析：`electron/services/music/platform/kugou/kugouResponse.ts`
