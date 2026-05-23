# 云斋（虚拟汽车）开发计划 — 定稿版

> **状态**：已确认（2026-05-23）  
> **视觉金标准**：[gamemcu SU7 官网](https://gamemcu.com/su7/)  
> **素材与 Shader 参考**：[alphardex/su7-replica](https://github.com/alphardex/su7-replica)（**允许使用**，见根目录 README）  
> **架构参考**：[gamemcu/www-genshin](https://github.com/gamemcu/www-genshin)（xviewer 分层思路，不引入 xviewer 运行时）  
> **关联文档**：`technical-design-v1.1-cloud-abode.docx`、`su7-reverse-engineering.md`、`user-requirements-v1.1-cloud-abode.docx`

---

## 1. 目标与原则

| 原则 | 说明 |
|------|------|
| **效果优先** | 以原版 SU7 官网交互与画质为验收基准，su7-replica 为可运行参考实现，而非最终上限。 |
| **代码自主** | 万物实现 `scene-renderer` + `cloud-abode`，**不** npm 依赖 kokomi.js / xviewer.js。 |
| **素材合法** | v1 开发期从 su7-replica 提取 glTF/HDR/贴图；**公开发行前**须确认授权或替换为自有/CC0 资产。 |
| **模块隔离** | 代码在 `src/modules/scene-renderer`、`src/modules/cloud-abode`；路由插在 RSS 下方。 |

---

## 2. 三方仓库与本地路径

### 2.1 su7-replica（素材 + 渲染思路）

```powershell
cd E:\work\code\git
git clone https://github.com/alphardex/su7-replica.git
cd su7-replica
npm install
npm run dev   # 本地对照 https://su7-replica.netlify.app/
```

**提取到万物**（按 `item.json` 从 su7-replica 手动拷贝）：

| 源路径（su7-replica/public） | 目标（Wanwu） |
|------------------------------|---------------|
| `mesh/sm_car.gltf` + bin + `sm_car_img*.webp` | `seed/.../items/xiaomi-su7/mesh/` |
| `mesh/sm_startroom*`、`sm_speedup*`、`Driving.fbx` | `assets/models/scene/` |
| `texture/t_env_*.hdr` | `assets/hdr/` |
| `texture/t_car_body_AO*` | `seed/.../items/xiaomi-su7/texture/` |
| `texture/t_floor_*`、`t_startroom_*` | `assets/texture/` |
| `audio/bgm.mp3` | `assets/audio/`（见 `showroomAssets.ts`） |

**从 su7-replica 移植的代码（改写为 TS，迁入 scene-renderer）**：

- `src/Experience/Shaders/ReflecFloor/*` → 展厅地面反射
- `src/Experience/Shaders/DynamicEnv/*` → 双 HDR 混合
- `src/Experience/Shaders/Speedup/*` → 加速线
- `src/Experience/Postprocessing.ts` → Bloom 封装
- `src/Experience/World/*.ts` → 行为参考（**不整文件拷贝**，按万物 API 重写）

### 2.2 www-genshin（架构参考）

```powershell
cd E:\work\code\git
git clone https://github.com/gamemcu/www-genshin.git
```

借鉴点：

- 资源预加载与进度回调
- 全屏 WebGL + DOM UI 分层（`.webgl-wrapper` / `#css-container` 同类结构）
- xviewer 生命周期：`printInfo`、colorSpace、loadingManager（用自研 `SceneRenderer` 等价实现）

### 2.3 gamemcu SU7（金标准，仅在线）

- 逆向备忘：`doc/design/su7-reverse-engineering.md`
- 本地 bundle（可选）：`doc/design/_su7-reverse/`（gitignore）
- **勿**从原站爬取 GLB 入库；缺省 mesh（风阻/雷达等）在 M5 用简化实现或后续补模

---

## 3. 技术栈（npm，写入 package.json）

| 包 | 版本建议 | 用途 |
|----|----------|------|
| `three` | `^0.170.0` | 核心 WebGL |
| `postprocessing` | `^6.36.0` | Bloom / EffectPass（与 su7-replica 一致） |
| `gsap` | `^3.12.0` | 镜头、环境、FOV Timeline |
| `howler` | `^2.2.4` | BGM（可选） |

Three.js 导入规范（r170+）：

```ts
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
```

> Context7：当前 IDE 若未挂载 context7 MCP，以 [three.js manual](https://threejs.org/manual/) 与上述导入为准。

---

## 4. 里程碑与任务

### M0 — 环境与素材（3 天）

- [ ] 克隆 `su7-replica` 至 `E:\work\code\git\su7-replica`
- [ ] 手动准备云斋 3D 资源
- [ ] 安装 `three`、`postprocessing`、`gsap`（+ 可选 `howler`）
- [ ] 在 `doc/design/` 保留逆向与本文档

**完成标准**：条目 `mesh/` 与全局 `assets/hdr`、`assets/texture`、`assets/audio` 就绪；`catalog.json` + `item.json`（id 为 UUID）路径约定正确。

---

### M1 — scene-renderer 骨架（5 天）

- [ ] 新建 `src/modules/scene-renderer/`：`SceneRenderer.ts`、`SceneCanvas.vue`、`types.ts`
- [ ] WebGLRenderer + PMREM + OrbitControls（阻尼）+ resize/dispose
- [ ] `AssetPipeline`：GLTFLoader + 进度事件
- [ ] 空场景渲染通过；Electron 切换模块无 GPU 泄漏

**完成标准**：Vue 页内全屏 canvas，加载 `sm_car.gltf` 可旋转查看（无后期）。

---

### M2 — 展厅 + PBR 车漆（7 天）

- [ ] 加载 `sm_startroom` + 双 HDR `DynamicEnv`
- [ ] 移植 `ReflecFloor` shader + AO 通道（`t_car_body_AO` channel=1）
- [ ] 车身 `MeshPhysicalMaterial`：clearcoat + matcap 高光（对标 SU7）
- [ ] 入场 Timeline：灯光/环境渐显（参考 su7-replica `World.enter`）

**完成标准**：并排对比 su7-replica / gamemcu，展厅光照与地板反射 **视觉接近**。

---

### M3 — cloud-abode 业务 UI（7 天）

- [ ] 路由 `/cloud-abode`、侧栏「云斋」、注册 `CloudAbodeView`
- [ ] UI：`ColorBar`（底）、`LeftCustomBar`（Hue）、加载条（SVG 速度线风格）
- [ ] `MaterialBinder`：读取 `item.json` 的 `customization`（车身色 / 轮毂 / 涂装）
- [ ] Pinia 持久化 `userData/cloud-abode/vehicles/*.json`

**完成标准**：定制色实时生效，重启恢复；主画布 ≥70% 视口。

---

### M4 — 行驶 rush 模式（5 天）

- [ ] 点击车身触发 rush（参考 `World.rush`）
- [ ] `sm_speedup` + FOV + `CameraShake`
- [ ] postprocessing Bloom 强度动画
- [ ] `kokomi.Environment` 等价逻辑：行驶中 `scene.environment` 切换（自研 `ReflectionProbe` 或简化版）

**完成标准**：加速线、镜头与 Bloom 与 su7-replica 演示一致。

---

### M5 — 扩展模式与打磨（10 天）

- [ ] 右侧 `StateTable` 模式切换 UI
- [ ] 风阻：clippingPlanes + 线条 Bloom（缺 mesh 时 v1 用简化线框）
- [ ] 雷达 / 尺寸：占位或简化 glTF
- [ ] Howler BGM、静音、画质档位（高/中/低）
- [ ] 性能：pixelRatio 上限、模块 `dispose`、打包体积评估

**完成标准**：对照下方 **SU7 验收清单** ≥85% 项通过。

---

## 5. SU7 官网验收清单（并排录屏）

| # | 能力 | 金标准 (gamemcu) | v1 目标 |
|---|------|------------------|---------|
| 1 | 全屏 WebGL + 加载进度 | ✓ | M1 |
| 2 | 展厅入场灯光动画 | ✓ | M2 |
| 3 | PBR 车身 + 环境反射 | ✓ | M2 |
| 4 | 底部 ColorBar 换色 | ✓ | M3 |
| 5 | 左侧 Hue/轮毂/涂装 | ✓ | M3 |
| 6 | 阻尼轨道相机 | ✓ | M1 |
| 7 | 点击车身行驶 rush | ✓ | M4 |
| 8 | 速度线 + FOV + 抖动 | ✓ | M4 |
| 9 | Bloom 后期 | ✓ | M4 |
| 10 | 风阻模式（切面+流线） | ✓ | M5 简化 |
| 11 | 雷达模式 | ✓ | M5 占位 |
| 12 | BGM / 静音 | ✓ | M5 |
| 13 | 截图闪白 | ✓ | M5 可选 |

---

## 6. 目录结构（目标）

种子与源码均按 **云斋子模块** 划分（`vehicles`、`home`…）：

```
src/modules/scene-renderer/          # 通用 WebGL（跨子模块）
  core/ SceneRenderer, AssetPipeline, PostFX
  shaders/ components/ composables/

src/modules/cloud-abode/
  CloudAbodeView.vue                 # 模块壳层
  vehicles/                          # 虚拟汽车
    views/ CarShowroomView, GarageListView
    components/ ColorBar, LeftCustomBar, StateTable, ShowroomPreloader
    stores/ services/ types/
  home/                              # 虚拟住宅（预留）

assets/seed/cloud-abode/
  README.md
  vehicles/
    catalog.json
    items/{slug}/item.json + mesh/   # 如 xiaomi-su7、xiaomi-yu7；id 为 UUID
assets/
  hdr/ texture/ audio/               # 全局共享（有引用再建目录）
  home/                              # 预留
```

---

## 7. 风险与对策

| 风险 | 对策 |
|------|------|
| su7-replica 无 License 文件 | 开发期使用；发行前法律审查或替换资产 |
| 缺风阻/雷达等 glTF | M5 简化；或 Blender 自制 |
| 安装包 +15MB 3D 资源 | 独立 `cloud-abode-assets.zip` 可选下载 |
| xviewer 黑盒 Shader | 以 su7-replica 已开源 GLSL + 官方 three 补齐 |

---

## 8. 排期汇总

| 里程碑 | 工期 | 累计 |
|--------|------|------|
| M0 | 3d | 3d |
| M1 | 5d | 8d |
| M2 | 7d | 15d |
| M3 | 7d | 22d |
| M4 | 5d | 27d |
| M5 | 10d | **37d**（约 7–8 周，单人） |

---

## 9. 下一步（立即执行）

1. 克隆 su7-replica → `E:\work\code\git\su7-replica`
2. 准备云斋资源
3. 开始 **M1** `scene-renderer` 骨架 PR
