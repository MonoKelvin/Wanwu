# 微交互

微交互（Micro-interactions）是完成单一任务的细微反馈：按钮 press state、toggle 动画、pull-to-refresh、like heart burst、form inline validation。Dan Saffer 在《Microinteractions》中定义 trigger–rules–feedback–loops 模型，是提升 perceived quality 的低成本高回报手段。

![交互动效概念示意](https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/640px-React-icon.svg.png)

## 设计师与品牌

Apple HIG Motion 强调 purposeful、realistic。Material Motion easing duration token。Framer Motion（React）、GSAP、Lottie（After Effects export JSON）为常用实现。Principle、ProtoPie 做 high-fidelity prototype microinteraction。

## 设计亮点

Duration：mobile 200–400 ms 为主；exit 可短于 enter。Easing：ease-out enter、ease-in exit；Material emphasized curve。Feedback：haptic（iOS UIImpactFeedbackGenerator）、sound sparingly。Skeleton screen 优于 blank spinner 减 perceived wait。Error shake、success checkmark 强化 outcome。Reduced motion：`prefers-reduced-motion` 提供 instant state change。

## 使用体验

Design：Figma smart animate 测 flow；dev 用 Framer Motion `whileTap={{ scale: 0.97 }}`。Performance：animate transform/opacity，避免 layout thrashing。Accessibility：animation 非唯一 feedback channel。A/B test subtle vs no animation 对 conversion 影响。Over-animation 致 nausea 或 distraction，需 design review gate。

## 文化影响

Instagram like、Twitter heart、Apple Pay success check 成为 industry reference。Duolingo streak 动画驱动 retention 案例。中国 App 红包、签到动画强化 gamification。Design Twitter 常 debate「micro vs macro interaction」优先级；good microinteraction  invisible until removed。

## 参考与延伸阅读

- [Material Design Motion](https://m3.material.io/styles/motion/overview)
- [Apple HIG：Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Framer Motion 文档](https://www.framer.com/motion/)
