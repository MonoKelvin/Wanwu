/** 将 IPC/Error 原始信息转为用户可读文案 */
export function formatPlayError(raw: string): string {
  return (
    raw
      .replace(/^Error invoking remote method '[^']+':\s*/i, '')
      .replace(/^Error:\s*/i, '')
      .trim() || '播放失败'
  )
}
