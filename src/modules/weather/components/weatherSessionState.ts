/** 渲染进程：避免侧栏天气挂件反复请求 geolocation */
let geoAttemptedThisSession = false

export function wasWeatherGeoAttempted(): boolean {
  return geoAttemptedThisSession
}

export function markWeatherGeoAttempted(): void {
  geoAttemptedThisSession = true
}
