import { useState } from 'react'
import { formatMinutes } from '../lib/time'
import WeeklyChart from './WeeklyChart'

export default function StatsPanel({ today, stats, onReview }) {
  const [review, setReview] = useState(null) // { text, source }
  const [loading, setLoading] = useState(false)

  const handleReview = async () => {
    setLoading(true)
    try {
      const result = await onReview()
      setReview(result)
    } catch {
      setReview({ text: '复盘生成失败，请稍后再试。', source: 'local' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stats">
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon">🍅</div>
          <div className="stat-value">{today.pomodoros}</div>
          <div className="stat-label">今日完成番茄</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-value">{formatMinutes(today.focusMinutes)}</div>
          <div className="stat-label">今日专注时长</div>
        </div>
      </div>

      <div className="panel-subtitle">最近 7 天专注</div>
      <WeeklyChart stats={stats} />

      <div className="review">
        {!review && (
          <button className="btn btn-ghost" onClick={handleReview} disabled={loading}>
            {loading ? '生成中…' : '✨ 生成今日复盘'}
          </button>
        )}
        {review && (
          <div className="review-box">
            <div className="review-head">
              <span>📋 今日复盘</span>
              <span className={`badge ${review.source === 'ai' ? 'badge-ai' : ''}`}>
                {review.source === 'ai' ? 'AI 生成' : '本地分析'}
              </span>
            </div>
            <p className="review-text">{review.text}</p>
            <button className="btn btn-ghost btn-sm" onClick={handleReview} disabled={loading}>
              {loading ? '生成中…' : '重新生成'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
