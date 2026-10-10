// 数据持久化层：localStorage 起步。
// 后续升级多用户 / 云同步时，只需把这里的 load / save 换成 Supabase 调用，
// 上层业务代码无需改动 —— 这是刻意的扩展点。

const PREFIX = 'pomodoro.'

export const KEYS = {
  settings: PREFIX + 'settings',
  tasks: PREFIX + 'tasks',
  stats: PREFIX + 'stats',
  onboardingSeen: PREFIX + 'onboardingSeen',
  activeTaskId: PREFIX + 'activeTaskId',
}

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    // 数据损坏 / 隐私模式等异常场景，静默回退到默认值
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 存储已满等场景静默失败，不阻塞主流程
  }
}
