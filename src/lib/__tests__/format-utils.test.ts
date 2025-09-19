import { describe, it, expect } from "vitest"
import { formatGender, formatAgeGroup } from "../format-utils"

describe("formatGender", () => {
  it("returns Male for MALE", () => {
    expect(formatGender("MALE")).toBe("Male")
  })

  it("returns Female for FEMALE", () => {
    expect(formatGender("FEMALE")).toBe("Female")
  })

  it("returns em dash for null", () => {
    expect(formatGender(null)).toBe("—")
  })

  it("returns em dash for undefined", () => {
    expect(formatGender(undefined)).toBe("—")
  })
})

describe("formatAgeGroup", () => {
  it("formats AGE_18_24 correctly", () => {
    expect(formatAgeGroup("AGE_18_24")).toBe("18-24")
  })

  it("formats AGE_65_PLUS correctly", () => {
    expect(formatAgeGroup("AGE_65_PLUS")).toBe("65+")
  })

  it("returns em dash for null", () => {
    expect(formatAgeGroup(null)).toBe("—")
  })

  it("returns em dash for undefined", () => {
    expect(formatAgeGroup(undefined)).toBe("—")
  })
})
