import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function getOrdinal(day: number) {
  const remainder = day % 100
  if (remainder >= 11 && remainder <= 13) return `${day}th`
  switch (day % 10) {
    case 1:
      return `${day}st`
    case 2:
      return `${day}nd`
    case 3:
      return `${day}rd`
    default:
      return `${day}th`
  }
}

function parseDateLike(value: string | Date) {
  if (value instanceof Date) return value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00Z`)
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return new Date(value.replace(" ", "T") + "Z")
  }
  return new Date(value)
}

type PrettyDateOptions = {
  includeTime?: boolean
  timeZone?: string
}

export function formatPrettyDate(
  value: string | Date | null | undefined,
  options: PrettyDateOptions = {}
) {
  if (!value) return ""

  const date = parseDateLike(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const timeZone = options.timeZone ?? "Europe/London"
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    month: "short",
    year: "numeric",
    day: "numeric",
  }).formatToParts(date)

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    dateParts.find((part) => part.type === type)?.value ?? ""

  const day = Number(getPart("day"))
  const weekday = getPart("weekday")
  const month = getPart("month")
  const year = getPart("year")
  const dateLabel = `${weekday} ${getOrdinal(day)} ${month} ${year}`

  if (!options.includeTime) return dateLabel

  const timeLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace(/\s/g, "")
    .toLowerCase()

  return `${timeLabel} ${dateLabel}`
}
