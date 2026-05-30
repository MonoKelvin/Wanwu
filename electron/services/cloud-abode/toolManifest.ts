import type { CaToolManifest } from '../../../src/shared/types/cloud-abode'

export const TOOL_MANIFEST: CaToolManifest[] = [
  {
    id: 'joke',
    name: '冷笑话',
    category: 'fun',
    offline: false,
    dailyRewardLimit: 5,
    description: '随机一条笑话，完成可获得虚拟奖励'
  },
  {
    id: 'riddle',
    name: '脑筋急转弯',
    category: 'fun',
    offline: true,
    dailyRewardLimit: 5,
    description: '本地脑筋急转弯题库'
  },
  {
    id: 'kana',
    name: '日语五十音',
    category: 'study',
    offline: true,
    dailyRewardLimit: 8,
    description: '随机一个假名与罗马音'
  },
  {
    id: 'daily-poem',
    name: '每日一诗',
    category: 'literature',
    offline: false,
    dailyRewardLimit: 3,
    description: '今日诗词（需联网，失败时使用本地备选）'
  },
  {
    id: 'word',
    name: '英语单词',
    category: 'study',
    offline: false,
    dailyRewardLimit: 5,
    description: '随机英语单词与释义'
  },
  {
    id: 'pandoc',
    name: '文档转换',
    category: 'file',
    offline: true,
    dailyRewardLimit: 3,
    description: 'Markdown/Word 互转（需本机安装 Pandoc，v1.1.1 完善）'
  }
]

export function getToolManifest(toolId: string): CaToolManifest | undefined {
  return TOOL_MANIFEST.find((t) => t.id === toolId)
}
