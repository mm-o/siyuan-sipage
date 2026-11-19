/**
 * 天气数据形状（三个后端共用同一套结构，卡片与详情只认它）
 */
export interface WeatherHour {
  /** 当地时刻 YYYY-MM-DDTHH:mm */
  time: string
  code: number
  temp: number
}

export interface WeatherDay {
  /** 当地日期 YYYY-MM-DD */
  date: string
  code: number
  max: number
  min: number
  /** 当地时刻 HH:mm */
  sunrise: string
  sunset: string
}

export interface WeatherNow {
  temp: number
  /** 体感温度 */
  feels: number
  humidity: number
  /** 风速 km/h */
  wind: number
  code: number
  isDay: boolean
  /** 当地观测时刻 YYYY-MM-DDTHH:mm */
  time: string
}

export interface WeatherData {
  now: WeatherNow
  hours: WeatherHour[]
  days: WeatherDay[]
}
