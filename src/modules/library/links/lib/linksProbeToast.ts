import type { LinksProbeSummary } from '@shared/types/links'

export function formatLinksProbeDetail(summary: LinksProbeSummary): string {
  if (summary.invalidCount === 0) {
    return '未发现无效链接'
  }

  const parts: string[] = [`共 ${summary.invalidCount} 条无效`]
  const { byIssue } = summary
  if (byIssue.invalid_syntax > 0) parts.push(`格式错误 ${byIssue.invalid_syntax}`)
  if (byIssue.network > 0) parts.push(`无法连接 ${byIssue.network}`)
  if (byIssue.timeout > 0) parts.push(`超时 ${byIssue.timeout}`)
  if (byIssue.http_status > 0) parts.push(`页面不可用 ${byIssue.http_status}`)
  return parts.join('，')
}
