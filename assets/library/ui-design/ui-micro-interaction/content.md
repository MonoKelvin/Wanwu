# 微交互（Micro-interaction）

微交互是界面中**单任务、短时长**的反馈循环：按钮按下态、toggle 动画、pull-to-refresh、点赞 heart burst、表单校验 shake 等。Dan Saffer 在《Microinteractions》中将其定义为 trigger → rules → feedback → loops，是提升**感知品质（perceived quality）** 的低成本杠杆。

![Apple 标志（iOS 微交互代表平台，维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/240px-Apple_logo_black.svg.png)

## 背景与历史

早期 iOS 滑动解锁与 SMS whoosh 音效树立标杆；Material Motion 规范 duration/easing；Web 端 CSS transition 与 **Lottie**、**Rive** 丰富动效表达。Framer Motion、React Spring 等库降低实现门槛；但 Apple HIG 警告过度 motion 引发 vestibular disorder，需尊重 `prefers-reduced-motion`。

## UX 原则与产品影响

- **反馈**：用户操作后 100ms 内应有视觉/触觉响应，否则感觉「点了没反应」。
- **状态沟通**：loading skeleton 优于 spinner 阻塞；progress 微交互减少 uncertainty anxiety。
- **防错**：destructive action 二次确认 + subtle shake；undo toast 优于 modal 打断。
- **品牌个性**：Stripe、Linear 的 easing curve 成为 subconscious brand cue。

微交互不应喧宾夺主；**functional animation** 服务 orientation，非 decoration。

## 冷知识

- Dan Saffer 举例 Gmail「Send」后 undo bar 是 microinteraction 经典——短 loop + 出口。
- iOS **Taptic Engine** 让 Haptic 与 visual 同步，Android 8+ 起强化 vibration effect API。
- 点赞动画若超过 300ms 且无 skip，可能降低 power user 效率——需 context 权衡。

## 参考与延伸阅读

- [Material Design：Motion](https://m3.material.io/styles/motion/overview)
- [Apple HIG：Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Dan Saffer：Microinteractions（O'Reilly）](https://www.oreilly.com/library/view/microinteractions/9781449341737/)
