/**
 * 第三方公共接口（一言 / 诗词 / 英语 / 国内天气）
 *
 * 域名与英语路由前缀是服务方的线上协议，必须原样请求 —— 改了就取不到数据。
 * 全库只有这一处出现，其它地方一律走 API_BASE / API_EN。
 */
export const API_BASE = "https://base.itab.link"

/** 英语句子挂在服务方的二级路由下（线上协议，原样保留） */
export const API_EN = `${API_BASE}/itab/todayEnglish`
