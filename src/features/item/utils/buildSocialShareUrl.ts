/** 微博 Web 分享（pic 需公网可访问的图片 URL） */
export function buildWeiboShareUrl(params: { title: string; picUrl?: string; pageUrl?: string }) {
  const q = new URLSearchParams()
  q.set('title', params.title)
  if (params.picUrl) q.set('pic', params.picUrl)
  if (params.pageUrl) q.set('url', params.pageUrl)
  return `https://service.weibo.com/share/share.php?${q.toString()}`
}

/** QQ 空间一键分享 */
export function buildQzoneShareUrl(params: {
  title: string
  summary?: string
  picUrl?: string
  pageUrl?: string
}) {
  const q = new URLSearchParams()
  q.set('title', params.title)
  if (params.summary) q.set('summary', params.summary)
  const link = params.pageUrl ?? params.picUrl ?? ''
  if (link) q.set('url', link)
  if (params.picUrl) q.set('pics', params.picUrl)
  return `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?${q.toString()}`
}
