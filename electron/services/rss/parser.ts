import Parser from 'rss-parser'

export const RSS_USER_AGENT = 'Wanwu/1.0 (Desktop; +https://github.com/MonoKelvin/Wanwu)'

/** 创建带统一 UA 与超时的 RSS 解析器 */
export function createRssParser(timeoutMs: number): Parser {
  return new Parser({
    timeout: timeoutMs,
    headers: { 'User-Agent': RSS_USER_AGENT }
  })
}
