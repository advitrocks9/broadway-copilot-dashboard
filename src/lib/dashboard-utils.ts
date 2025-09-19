export function getLastWeek(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getTime() - 7 * 86400000)
  return { start, end: now }
}

export function formatBucketLabel(d: Date, includeTime: boolean): string {
  const yyyy = d.getFullYear()
  const mm = (d.getMonth() + 1).toString().padStart(2, "0")
  const dd = d.getDate().toString().padStart(2, "0")
  if (!includeTime) return `${yyyy}-${mm}-${dd}`
  const hh = d.getHours().toString().padStart(2, "0")
  const min = d.getMinutes().toString().padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

export function enumerateBuckets(
  start: Date,
  end: Date,
  stepMs: number,
): { key: string; date: Date }[] {
  const points: { key: string; date: Date }[] = []
  const alignedStart = new Date(Math.floor(start.getTime() / stepMs) * stepMs)
  const cursor = new Date(alignedStart)
  while (cursor <= end) {
    points.push({ key: formatBucketLabel(cursor, true), date: new Date(cursor) })
    cursor.setTime(cursor.getTime() + stepMs)
  }
  return points
}
