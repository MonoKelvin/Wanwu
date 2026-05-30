import type { NotePlaceholderHint } from '@modules/library/notes/lib/notePlaceholderTypes'

/**
 * 便笺正文占位提示库。
 * 新增条目：补充 id、text，按需设置 timeSlots / weatherTags / weight。
 * 天气类提示：设置 weatherTags，并在 pickNotePlaceholder 传入 context.weatherTags。
 */
export const NOTE_PLACEHOLDER_HINTS: readonly NotePlaceholderHint[] = [
  // —— 清晨 morning (5:00–9:00) ——
  {
    id: 'morning-memory',
    text: '早安，今天最想留住的一件小事是...',
    timeSlots: ['morning']
  },
  {
    id: 'morning-fresh',
    text: '新的一天，用一句话跟自己打个招呼',
    timeSlots: ['morning']
  },
  {
    id: 'morning-coffee',
    text: '早安呀，咖啡喝了吗？顺手记一笔',
    timeSlots: ['morning']
  },
  {
    id: 'morning-bed',
    text: '赖床五分钟也值得被记住的理由',
    timeSlots: ['morning'],
    weight: 1.1
  },
  {
    id: 'morning-energy',
    text: '今日份元气，给自己打个分？',
    timeSlots: ['morning']
  },
  {
    id: 'morning-light',
    text: '晨光里闪过的一句话...',
    timeSlots: ['morning']
  },
  {
    id: 'morning-warm',
    text: '醒来第一件事：想感谢谁？',
    timeSlots: ['morning']
  },

  // —— 上午 forenoon (9:00–11:00) ——
  {
    id: 'forenoon-todo',
    text: '上午的计划，完成一件也算进步',
    timeSlots: ['forenoon']
  },
  {
    id: 'forenoon-half',
    text: '上午过半，有没有偷偷开心的小事？',
    timeSlots: ['forenoon']
  },
  {
    id: 'forenoon-breath',
    text: '忙了一早上，歇口气写两句',
    timeSlots: ['forenoon']
  },
  {
    id: 'forenoon-playful',
    text: '摸鱼不算，记录灵感算——你懂的',
    timeSlots: ['forenoon']
  },

  // —— 正午 noon (11:00–13:00) ——
  {
    id: 'noon-pause',
    text: '午间歇一歇，此刻的状态是...',
    timeSlots: ['noon']
  },
  {
    id: 'noon-lunch',
    text: '干饭时间！今天午饭朝思暮想的是？',
    timeSlots: ['noon'],
    weight: 1.15
  },
  {
    id: 'noon-sun',
    text: '正午阳光正好，适合胡写几句',
    timeSlots: ['noon']
  },
  {
    id: 'noon-nap',
    text: '眯一会儿之前，脑子还亮着吗？',
    timeSlots: ['noon']
  },

  // —— 午后 afternoon (13:00–17:00) ——
  {
    id: 'afternoon-drift',
    text: '午后的思绪，先安放在这里',
    timeSlots: ['afternoon']
  },
  {
    id: 'afternoon-nap',
    text: '困了就写点废话，没关系的',
    timeSlots: ['afternoon']
  },
  {
    id: 'afternoon-tea',
    text: '下午茶配什么想法？',
    timeSlots: ['afternoon']
  },
  {
    id: 'afternoon-slump',
    text: '下午三点的摸鱼心得（认真版）',
    timeSlots: ['afternoon'],
    weight: 1.1
  },
  {
    id: 'afternoon-window',
    text: '望向窗外的一小会儿，看见了什么？',
    timeSlots: ['afternoon']
  },

  // —— 傍晚 evening (17:00–22:00) ——
  {
    id: 'evening-reflect',
    text: '晚安，把今天的心事写下来吧',
    timeSlots: ['evening', 'night']
  },
  {
    id: 'evening-thanks',
    text: '傍晚了，今天辛苦啦',
    timeSlots: ['evening']
  },
  {
    id: 'evening-sunset',
    text: '落日之前，还有什么想对自己说的？',
    timeSlots: ['evening']
  },
  {
    id: 'evening-commute',
    text: '下班路上的风景，或一句吐槽',
    timeSlots: ['evening']
  },
  {
    id: 'evening-dinner',
    text: '晚饭吃什么？先记下来再决定',
    timeSlots: ['evening'],
    weight: 1.05
  },
  {
    id: 'evening-prep-goodnight',
    text: '晚安预备——先把零碎念头收进来',
    timeSlots: ['evening', 'night']
  },

  // —— 深夜 night (22:00–5:00) ——
  {
    id: 'night-bedtime',
    text: '夜已深，临睡前还想记下的一句...',
    timeSlots: ['night']
  },
  {
    id: 'night-moon',
    text: '月亮上班了，你的故事写到哪了？',
    timeSlots: ['night']
  },
  {
    id: 'night-owl',
    text: '夜猫子专属：反正都睡不着...',
    timeSlots: ['night'],
    weight: 1.1
  },
  {
    id: 'night-whisper',
    text: '给明天的自己留句悄悄话',
    timeSlots: ['night', 'evening']
  },
  {
    id: 'night-typo',
    text: '星星不介意你写错别字',
    timeSlots: ['night']
  },
  {
    id: 'night-insomnia',
    text: '失眠之夜，让文字陪着',
    timeSlots: ['night']
  },

  // —— 全天 · 调皮 ——
  {
    id: 'playful-catch',
    text: '咦，刚才想啥来着？快攥住',
    weight: 1.05
  },
  {
    id: 'playful-chaos',
    text: '官方许可：这里可以不讲道理',
    weight: 1.05
  },
  {
    id: 'playful-random',
    text: '瞎写区，欢迎歪楼',
    weight: 1.05
  },
  {
    id: 'playful-parenthesis',
    text: '括号里的真心话（请展开）'
  },
  {
    id: 'playful-hint',
    text: '这条提示也在摸鱼，你随意',
    weight: 1.1
  },
  {
    id: 'playful-brain',
    text: '大脑：我有想法。手：那你倒是记啊'
  },

  // —— 全天 · 暖心 ——
  {
    id: 'warm-deserve',
    text: '今天也好好过了，值得记一笔',
    weight: 1.15
  },
  {
    id: 'warm-kind',
    text: '对自己说句好听的吧',
    weight: 1.1
  },
  {
    id: 'warm-small-win',
    text: '小的进步算数，大的先欠着'
  },
  {
    id: 'warm-safe',
    text: '有人惦记的事，写这儿稳妥'
  },
  {
    id: 'warm-hug',
    text: '累了就写两句，不必很精彩'
  },
  {
    id: 'warm-gratitude',
    text: '今天想感谢谁，因为...'
  },

  // —— 全天 · 随性 ——
  {
    id: 'casual-free',
    text: '爱写啥写啥，无需开场白',
    weight: 1.1
  },
  {
    id: 'casual-empty',
    text: '脑子空空也没关系，敲几个字试试'
  },
  {
    id: 'casual-scatter',
    text: '东一句西一句，正好'
  },
  {
    id: 'casual-honest',
    text: '反正没人盯着，说点真话'
  },
  {
    id: 'casual-fragments',
    text: '暂无章法，先记几段碎片也可以'
  },
  {
    id: 'casual-quiet',
    text: '四周很安静，写点什么吧'
  },

  // —— 全天 · 日常记录 ——
  {
    id: 'win-today',
    text: '今天有什么小收获？',
    weight: 1.2
  },
  {
    id: 'learning',
    text: '最近在学什么？记下几个关键点'
  },
  {
    id: 'right-now',
    text: '此时此刻，我想说...'
  },
  {
    id: 'flash-idea',
    text: '突然冒出来的想法，先别让它溜走'
  },
  {
    id: 'tomorrow-remind',
    text: '明天要记得的事...'
  },
  {
    id: 'weekly-goal',
    text: '这周的一个小目标'
  },
  {
    id: 'quote',
    text: '读到的一句好话，值得留下来'
  },
  {
    id: 'travel',
    text: '路上的风景，或遇见的人'
  },
  {
    id: 'work-lesson',
    text: '工作里踩过的坑，下次可以避开'
  },
  {
    id: 'kitchen',
    text: '厨房里的一次实验，味道如何？'
  },
  {
    id: 'bookmark',
    text: '值得收藏的网站、工具或方法'
  },
  {
    id: 'list-three',
    text: '随便列三件此刻在意的事'
  },
  {
    id: 'mood',
    text: '给今天的情绪打个标签，再写两句'
  }

  // 天气扩展示例（接入 weatherTags 后生效）：
  // { id: 'weather-rain', text: '外面在下雨，此刻的心情是...', weatherTags: ['rain'] },
  // { id: 'weather-sunny', text: '阳光不错，今天想多记一点', weatherTags: ['sunny'] }
]
