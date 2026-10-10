// api/plan.js —— Vercel Serverless 函数（Claude API 代理）
//
// 作用：前端只调本函数，Claude API Key 只存在 Vercel 环境变量里（ANTHROPIC_API_KEY），
//       绝不写进前端代码 / 仓库。前端在 src/lib/ai.js 里通过 VITE_AI_ENDPOINT=/api/plan 调用。
//
// 两个动作：
//   POST { goal }                            → 拆解目标，返回 { tasks: [{title, estimatedPomodoros}] }
//   POST { action:'review', today, tasks }   → 生成复盘，返回 { text }
//
// 本地无 Key / 未部署时，前端会自动降级到本地启发式（见 src/lib/ai.js），本函数不会被调用。

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic() // 自动读取 process.env.ANTHROPIC_API_KEY

// 结构化输出的 JSON Schema：约束 AI 返回合法的任务数组
const TASKS_SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          estimatedPomodoros: { type: 'integer' },
        },
        required: ['title', 'estimatedPomodoros'],
        additionalProperties: false,
      },
    },
  },
  required: ['tasks'],
  additionalProperties: false,
}

const PLAN_SYSTEM = [
  '你是一个任务规划助手。',
  '把用户的目标拆解成 3~5 个具体、可执行、有先后顺序的番茄钟任务。',
  '每个任务给出：标题（一句话，动词开头）和预估需要的番茄数（1~8 的整数）。',
].join('\n')

const REVIEW_SYSTEM = [
  '你是一个专注力教练。',
  '根据用户今天的专注数据（完成番茄数、专注时长）和任务完成情况，',
  '生成一段 2~4 句的复盘建议：语气积极、具体、可操作，不要空话。',
].join('\n')

function extractText(content) {
  return content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    // 没配 Key：明确返回 503，前端会降级到本地模板
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }

  try {
    if (body.action === 'review') {
      return res.status(200).json({ text: await review(body) })
    }
    return res.status(200).json({ tasks: await plan(body.goal) })
  } catch (err) {
    console.error('[api/plan]', err)
    return res.status(500).json({ error: 'AI 服务暂时不可用' })
  }
}

async function plan(goal) {
  const goalText = (goal || '').trim()
  if (!goalText) return []

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: TASKS_SCHEMA } },
    system: PLAN_SYSTEM,
    messages: [{ role: 'user', content: goalText }],
  })

  const data = JSON.parse(extractText(response.content))
  return Array.isArray(data.tasks) ? data.tasks : []
}

async function review({ today, tasks }) {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    system: REVIEW_SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify({ today, tasks }, null, 2) }],
  })
  return extractText(response.content)
}
