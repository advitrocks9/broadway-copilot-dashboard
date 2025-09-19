export type TimeSeriesDataPoint = {
  time: string
  value: number
}

export type TopMetrics = {
  messages: number
  errors: number
  activeUsers: number
  costUsd: number
}

export type TimeSeries = {
  messages: TimeSeriesDataPoint[]
  errors: TimeSeriesDataPoint[]
}

export type ModelCost = {
  model: string
  cost: number
}

export type BarChartDataPoint = {
  time: string
  messages: number
  errors: number
}
