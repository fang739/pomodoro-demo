// 时间与日期格式化工具

/** 秒 → "MM:SS" */
export function formatSeconds(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/** 分钟 → 人类可读中文 */
export function formatMinutes(minutes) {
  minutes = Math.round(minutes)
  if (minutes < 60) return `${minutes} 分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`
}

/** 本地时区日期 key，如 "2026-10-10" */
export function dateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 最近 n 天（含今天），返回 [{ key, label, isToday }] */
export function lastNDays(n) {
  const out = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    out.push({
      key: dateKey(d),
      label: i === 0 ? '今天' : `${d.getMonth() + 1}/${d.getDate()}`,
      isToday: i === 0,
    })
  }
  return out
}
