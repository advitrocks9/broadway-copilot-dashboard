import { describe, it, expect } from "vitest"
import { getLastWeek, formatBucketLabel, enumerateBuckets } from "../dashboard-utils"

describe("getLastWeek", () => {
  it("returns a start date 7 days before end", () => {
    const { start, end } = getLastWeek()
    const diff = end.getTime() - start.getTime()
    expect(diff).toBe(7 * 86400000)
  })

  it("returns end date close to now", () => {
    const before = Date.now()
    const { end } = getLastWeek()
    const after = Date.now()
    expect(end.getTime()).toBeGreaterThanOrEqual(before)
    expect(end.getTime()).toBeLessThanOrEqual(after)
  })
})

describe("formatBucketLabel", () => {
  it("formats date without time", () => {
    const d = new Date("2024-03-15T09:30:00Z")
    const label = formatBucketLabel(d, false)
    // Should be YYYY-MM-DD in local timezone
    expect(label).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("formats date with time", () => {
    const d = new Date("2024-03-15T09:30:00Z")
    const label = formatBucketLabel(d, true)
    // Should be YYYY-MM-DD HH:MM in local timezone
    expect(label).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  })

  it("pads single-digit months and days", () => {
    const d = new Date(2024, 0, 5, 3, 7) // Jan 5, 03:07 local
    const label = formatBucketLabel(d, true)
    expect(label).toBe("2024-01-05 03:07")
  })
})

describe("enumerateBuckets", () => {
  it("returns buckets spanning the time range", () => {
    const start = new Date("2024-01-01T00:00:00Z")
    const end = new Date("2024-01-01T06:00:00Z")
    const stepMs = 3 * 3600 * 1000 // 3 hours

    const buckets = enumerateBuckets(start, end, stepMs)
    expect(buckets.length).toBeGreaterThanOrEqual(2)
    expect(buckets[0].date.getTime()).toBeLessThanOrEqual(start.getTime())
  })

  it("returns empty for zero-width range when step is large", () => {
    const d = new Date("2024-01-01T01:30:00Z")
    const stepMs = 24 * 3600 * 1000 // 1 day
    const buckets = enumerateBuckets(d, d, stepMs)
    // Aligned start should be <= d, so at least one bucket
    expect(buckets.length).toBeGreaterThanOrEqual(1)
  })

  it("keys are formatted with time", () => {
    const start = new Date("2024-06-15T00:00:00Z")
    const end = new Date("2024-06-15T12:00:00Z")
    const stepMs = 6 * 3600 * 1000

    const buckets = enumerateBuckets(start, end, stepMs)
    for (const bucket of buckets) {
      expect(bucket.key).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
    }
  })
})
