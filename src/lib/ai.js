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

/** 剥掉常见口头禅，提炼目标核心 */
function extractCore(goal) {
  return String(goal || '')
    .replace(/^(帮我|我想要|我想|我要|我需要|打算|准备|计划|今天|明天|接下来)?\s*/, '')
    .replace(/[，,。.!！?？\s]+$/, '')
    .trim()
    .slice(0, 24)
}

/** 按目标关键词匹配更贴题的拆解模板（领域模板） */
const DOMAIN_TEMPLATES = [
  {
    test: /面试|面经|求职|岗位|简历|招聘/,
    build: (core) => [
      { title: `梳理${core}的岗位要求与高频考点`, estimatedPomodoros: 1 },
      { title: '过一遍核心知识点并记录薄弱项', estimatedPomodoros: 2 },
      { title: '准备两个项目的 STAR 讲法', estimatedPomodoros: 2 },
      { title: '手写并口述三道高频题', estimatedPomodoros: 2 },
      { title: '模拟一轮自我介绍与反问', estimatedPomodoros: 1 },
    ],
  },
  {
    test: /复习|备考|考试|背|刷题/,
    build: (core) => [
      { title: `划出${core}的考试范围与分值分布`, estimatedPomodoros: 1 },
      { title: '集中攻克权重最高的一个章节', estimatedPomodoros: 2 },
      { title: '做一组针对性练习题', estimatedPomodoros: 2 },
      { title: '整理错题与易混知识点', estimatedPomodoros: 1 },
      { title: '用回忆法自测一遍', estimatedPomodoros: 1 },
    ],
  },
  {
    test: /写|文章|报告|论文|方案|总结|文档|ppt|PPT/,
    build: (core) => [
      { title: `确定${core}的读者与核心结论`, estimatedPomodoros: 1 },
      { title: '列出文章骨架与三级标题', estimatedPomodoros: 1 },
      { title: '写完正文主体部分', estimatedPomodoros: 2 },
      { title: '补充数据、案例与开头结尾', estimatedPomodoros: 2 },
      { title: '通读一遍并删掉废话', estimatedPomodoros: 1 },
    ],
  },
  {
    test: /开发|实现|做|代码|功能|项目|需求|bug|Bug|重构|联调/,
    build: (core) => [
      { title: `理清${core}的输入输出与边界条件`, estimatedPomodoros: 1 },
      { title: '拆出最小可验证的实现步骤', estimatedPomodoros: 1 },
      { title: '完成核心链路的第一版代码', estimatedPomodoros: 2 },
      { title: '补上异常分支与自测', estimatedPomodoros: 2 },
      { title: '回归验证并提交/记录', estimatedPomodoros: 1 },
    ],
  },
  {
    test: /学习|入门|掌握|课程|教程|看书|阅读|研究/,
    build: (core) => [
      { title: `明确${core}要达成的验收标准`, estimatedPomodoros: 1 },
      { title: '浏览全貌并建立知识地图', estimatedPomodoros: 1 },
      { title: '精读最关键的一章并做笔记', estimatedPomodoros: 2 },
      { title: '动手做一个最小练习', estimatedPomodoros: 2 },
      { title: '用自己的话复述一遍收获', estimatedPomodoros: 1 },
    ],
  },
  {
    test: /健身|跑步|运动|减肥|锻炼|作息|早睡/,
    build: (core) => [
      { title: `为${core}定一个可量化的小目标`, estimatedPomodoros: 1 },
      { title: '准备装备/场地并排除干扰', estimatedPomodoros: 1 },
      { title: '完成今天的第一次训练', estimatedPomodoros: 2 },
      { title: '记录身体反馈与数据', estimatedPomodoros: 1 },
    ],
  },
]

/** 本地启发式拆解：领域模板 > 分隔符切片 > 通用模板 */
function heuristicBreakdown(goal) {
  const cleaned = (goal || '').trim()
  const core = extractCore(cleaned) || '今日目标'

  // 1) 关键词命中领域模板
  const hit = DOMAIN_TEMPLATES.find((t) => t.test.test(cleaned))
  if (hit) return hit.build(core)

  // 2) 按分隔符切成显式子目标
  const parts = cleaned
    .split(/[，,。；;、\n和与及]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
  if (parts.length >= 2) {
    return parts
      .slice(0, 6)
      .map((title) => ({ title, estimatedPomodoros: estimatePomodoros(title) }))
  }

  // 3) 通用模板
  return [
    `明确${core}的验收标准与范围`,
    `拆出${core}的关键步骤清单`,
    `推进${core}最关键的一环`,
    `对${core}做一轮实操验证`,
    `复盘${core}并补齐薄弱点`,
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
