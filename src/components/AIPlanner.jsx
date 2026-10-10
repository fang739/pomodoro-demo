import { useState } from 'react'
import { planTasks } from '../lib/ai'

export default function AIPlanner({ onAddTasks, notify }) {
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { tasks, source }

  const run = async (e) => {
    e.preventDefault()
    const g = goal.trim()
    if (!g || loading) return
    setLoading(true)
    try {
      const r = await planTasks(g)
      setResult(r)
      if (r.tasks.length === 0) {
        notify('没能拆出任务，换个目标描述试试？', 'warn')
      }
    } catch {
      notify('AI 拆解失败，请稍后再试', 'error')
    } finally {
      setLoading(false)
    }
  }

  const addAll = () => {
    if (!result?.tasks?.length) return
    onAddTasks(result.tasks)
    notify(`已加入 ${result.tasks.length} 个任务`, 'success')
    setResult(null)
    setGoal('')
  }

  return (
    <div className="ai-planner">
      <div className="ai-head">
        <span className="ai-title">🤖 AI 规划</span>
        <span className="ai-sub">把目标拆成番茄任务</span>
      </div>

      <form className="ai-form" onSubmit={run}>
        <textarea
          className="ai-input"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="描述今天的目标，例如：准备周末的前端面试"
          rows={2}
          maxLength={120}
        />
        <button className="btn btn-primary" type="submit" disabled={!goal.trim() || loading}>
          {loading ? '拆解中…' : 'AI 拆解'}
        </button>
      </form>

      {result && (
        <div className="ai-result">
          <div className="ai-result-head">
            <span>拆解结果</span>
            <span className={`badge ${result.source === 'ai' ? 'badge-ai' : ''}`}>
              {result.source === 'ai' ? 'AI 生成' : '本地模板'}
            </span>
          </div>
          <ul className="ai-result-list">
            {result.tasks.map((t, i) => (
              <li key={i}>
                <span className="ai-task-title">{t.title}</span>
                <span className="ai-task-pom">🍅 ×{t.estimatedPomodoros}</span>
              </li>
            ))}
          </ul>
          <button className="btn btn-primary btn-block" onClick={addAll}>
            一键加入任务列表
          </button>
        </div>
      )}
    </div>
  )
}
