import type { Item } from '@modules/library/illustrated-handbook/domain/itemTypes'

/** �����ã����ơ���ǩ�������ϸ���ܣ����� ID�� */
export function buildItemCopyText(item: Item): string {
  const lines: string[] = [item.name]

  if (item.summary?.trim()) {
    lines.push('', item.summary.trim())
  }

  if (item.tags?.length) {
    lines.push('', `��ǩ��${item.tags.join('��')}`)
  }

  const specs = item.specs ?? {}
  const specKeys = Object.keys(specs)
  if (specKeys.length) {
    lines.push('', '������')
    for (const key of specKeys) {
      lines.push(`${key}��${specs[key]}`)
    }
  }

  if (item.description?.trim()) {
    lines.push('', '��ϸ����', item.description.trim())
  }

  return lines.join('\n')
}

/** �罻ƽ̨�����ö��İ� */
export function buildItemShareText(item: Item): string {
  const lines = [item.name]
  if (item.summary) lines.push(item.summary)
  lines.push('�� ���� Wanwu')
  return lines.join('\n')
}
