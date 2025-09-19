import type { Gender, AgeGroup } from "@prisma/client"

export function formatGender(gender: Gender | null | undefined): string {
  if (!gender) return "—"
  switch (gender) {
    case "MALE":
      return "Male"
    case "FEMALE":
      return "Female"
    default:
      return "—"
  }
}

/** Formats an AgeGroup enum value into a display string (e.g. AGE_18_24 -> 18-24) */
export function formatAgeGroup(ageGroup: AgeGroup | null | undefined): string {
  if (!ageGroup) return "—"
  return ageGroup.replace("AGE_", "").replace("_PLUS", "+").replace("_", "-")
}
