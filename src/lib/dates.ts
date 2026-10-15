// 日付ユーティリティ（日本語表示）

export function formatJP(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function formatJPFull(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export function monthKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  return `${Number(m)}月`
}

export function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime()
  const b = new Date(bIso).getTime()
  return Math.abs(Math.round((a - b) / (1000 * 60 * 60 * 24)))
}

export function relativeJP(iso: string, now: Date = new Date()): string {
  const days = Math.round((now.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return '今日'
  if (days === 1) return '昨日'
  if (days < 7) return `${days}日前`
  if (days < 30) return `${Math.floor(days / 7)}週間前`
  if (days < 365) return `${Math.floor(days / 30)}ヶ月前`
  return `${Math.floor(days / 365)}年前`
}
