// ============================================================================
// AI 能力 —— 扩展点说明（笔试重点：如何把"AI 驱动"落到产品上）
//
// 生产环境接入真实 Claude 的方式（Key 绝不进前端）：
//   1. 在 Vercel 部署一个 serverless 函数（如 /api/plan），函数内部读取
//      Vercel 环境变量里的 ANTHROPIC_API_KEY，调用 Claude Messages API。
//   2. 前端只请求 /api/plan，把目标文本 POST 过去，拿回任务数组。
//   3. 因此本文件里没有、也绝不允许出现任何 API Key。
//
// 本地 / 无 Key / 网络异常时：自动走本地启发式拆解（heuristicBreakdown），
// 保证 Demo 永远跑得通 —— 满足"API 不可用时优雅降级"的硬性要求。
// ============================================================================

import { formatMinutes } from './time'

// 通过 Vite 环境变量注入后端代理地址，例如 .env.local 里写：
//   VITE_AI_ENDPOINT=/api/plan
// 未配置则为 undefined，走本地降级。
const AI_ENDPOINT = import.meta.env.VITE_AI_ENDPOINT

/** 统一把后端返回的任务规整成内部结构 */
function normalizeTasks(list) {
  if (!Array.isArray(list)) return []
  return list
    .filter((t) => t && typeof t.title === 'string' && t.title.trim())
    .map((t) => ({
      title: t.title.trim(),
      estimatedPomodoros: clampPomodoros(t.estimatedPomodoros || t.pomodoros || 1),
    }))
    .slice(0, 6)
}

function clampPomodoros(n) {
  n = Number(n) || 1
  return Math.min(8, Math.max(1, Math.round(n)))
}

function estimatePomodoros(text) {
  const len = text.length
  if (len <= 6) return 1
  if (len <= 14) return 2
  if (len <= 24) return 3
  return 4
}

/** 本地启发式拆解：按分隔符切片，切不出再套模板 */
function heuristicBreakdown(goal) {
  const cleaned = (goal || '').trim()

  const parts = cleaned
    .split(/[，,。；;、\n和与及]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)

  if (parts.length >= 2) {
    return parts
      .slice(0, 6)
      .map((title) => ({ title, estimatedPomodoros: estimatePomodoros(title) }))
  }

  const subject = cleaned || '今日目标'
  return [
    `拆解「${subject}」的范围与验收标准`,
    '收集整理相关资料 / 素材',
    '完成核心部分第一版',
    '检查、修正与打磨细节',
    '复盘结果并记录下一步',
  ].map((title) => ({ title, estimatedPomodoros: estimatePomodoros(title) }))
}

/**
 * 目标 → 3-5 个可执行的番茄任务。
 * @returns {Promise<{ tasks: Array<{title, estimatedPomodoros}>, source: 'ai'|'local' }>}
 */
export async function planTasks(goal) {
  if (AI_ENDPOINT) {
    try {
      const res = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      })
      if (res.ok) {
        const data = await res.json()
        const tasks = normalizeTasks(data?.tasks)
        if (tasks.length) return { tasks, source: 'ai' }
      }
    } catch {
      // 服务不可用 → 降级到本地
    }
  }
  return { tasks: heuristicBreakdown(goal), source: 'local' }
}

function localReview({ today, tasks }) {
  const pomodoros = today?.pomodoros || 0
  const minutes = today?.focusMinutes || 0
  const doneCount = tasks.filter((t) => t.done).length
  const total = tasks.length
  const lines = []

  if (pomodoros === 0) {
    lines.push('今天还没有完成番茄，先从一个 25 分钟的小目标开始吧。')
  } else {
    lines.push(
      `今天完成了 ${pomodoros} 个番茄，累计专注 ${formatMinutes(minutes)}，节奏不错。`,
    )
  }

  if (total > 0) {
    const rate = Math.round((doneCount / total) * 100)
    const hint =
      rate >= 80 ? '收尾阶段，继续冲刺' : rate >= 40 ? '稳步推进中' : '建议把待办再拆小一点'
    lines.push(`任务完成 ${doneCount}/${total}（${rate}%），${hint}。`)
  }

  if (pomodoros >= 8) {
    lines.push('连续专注时间较长，注意每 4 个番茄安排一次长休息，保护注意力。')
  } else {
    lines.push('小建议：一次只专注一个任务，关掉干扰通知，效率会更高。')
  }

  return lines.join('\n')
}

/**
 * 今日复盘：根据专注数据 + 任务完成情况生成一段建议。
 * @returns {Promise<{ text: string, source: 'ai'|'local' }>}
 */
export async function generateReview({ today, tasks }) {
  if (AI_ENDPOINT) {
    try {
      const res = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          today,
          tasks: tasks.map((t) => ({ title: t.title, done: t.done })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (typeof data.text === 'string' && data.text.trim()) {
          return { text: data.text.trim(), source: 'ai' }
        }
      }
    } catch {
      // 降级
    }
  }
  return { text: localReview({ today, tasks }), source: 'local' }
}
