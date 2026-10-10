import { lastNDays } from '../lib/time'

/**
 * 最近 7 天专注柱状图：纯手写 SVG，不引入图表库，依赖零负担。
 * 数据为空时优雅降级为空态提示。
 */
export default function WeeklyChart({ stats }) {
  const days = lastNDays(7)
  const values = days.map((d) => stats?.[d.key]?.pomodoros || 0)
  const max = Math.max(1, ...values)

  return (
    <div className="chart">
      <div className="chart-bars">
        {days.map((d, i) => {
          const v = values[i]
          const h = Math.round((v / max) * 100)
          return (
            <div key={d.key} className="chart-col">
              <div className="chart-value">{v > 0 ? v : ''}</div>
              <div className="chart-bar-track">
                <div
                  className={`chart-bar ${d.isToday ? 'today' : ''} ${v === 0 ? 'empty' : ''}`}
                  style={{ height: `${Math.max(v > 0 ? 8 : 3, h)}%` }}
                  title={`${d.label}：${v} 个番茄`}
                />
              </div>
              <div className={`chart-label ${d.isToday ? 'today' : ''}`}>{d.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
