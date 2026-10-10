import { formatSeconds } from '../lib/time'

const MODE_META = {
  focus: { label: '专注', color: '#e5484d' },
  shortBreak: { label: '短休', color: '#30a46c' },
  longBreak: { label: '长休', color: '#4f8ae8' },
}

const R = 120
const C = 2 * Math.PI * R

export default function Timer({ timer, settings }) {
  const {
    mode,
    secondsLeft,
    totalSeconds,
    isRunning,
    start,
    pause,
    reset,
    skip,
    switchMode,
    focusCountInCycle,
  } = timer

  const meta = MODE_META[mode]
  const ratio = totalSeconds > 0 ? secondsLeft / totalSeconds : 0
  const dashOffset = C * (1 - ratio)
  const interval = settings.longBreakInterval || 4
  const cycleDone = focusCountInCycle % interval

  const runningLabel = mode === 'focus' ? '专注中' : '休息中'

  return (
    <div className="timer">
      <div className="mode-tabs" role="tablist" aria-label="计时模式">
        {Object.entries(MODE_META).map(([key, m]) => (
          <button
            key={key}
            role="tab"
            aria-selected={mode === key}
            className={`mode-tab ${mode === key ? 'active' : ''}`}
            style={mode === key ? { '--mode-color': m.color } : undefined}
            onClick={() => switchMode(key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="ring-wrap">
        <svg className="ring" viewBox="0 0 280 280" role="img" aria-label="倒计时进度环">
          <circle className="ring-track" cx="140" cy="140" r={R} />
          <circle
            className="ring-progress"
            cx="140"
            cy="140"
            r={R}
            style={{
              stroke: meta.color,
              strokeDasharray: C,
              strokeDashoffset: dashOffset,
            }}
          />
        </svg>
        <div className="ring-center">
          <div className="ring-time" style={{ color: meta.color }}>
            {formatSeconds(secondsLeft)}
          </div>
          <div className="ring-label">{isRunning ? runningLabel : '已暂停'}</div>
        </div>
      </div>

      {mode === 'focus' && (
        <div className="cycle-hint">
          <span className="cycle-dots">
            {Array.from({ length: interval }).map((_, i) => (
              <span key={i} className={`cycle-dot ${i < cycleDone ? 'filled' : ''}`} />
            ))}
          </span>
          每 {interval} 个番茄进入一次长休
        </div>
      )}

      <div className="timer-actions">
        <button className="btn btn-primary btn-lg" onClick={isRunning ? pause : start}>
          {isRunning ? '⏸ 暂停' : secondsLeft === totalSeconds ? '▶ 开始' : '▶ 继续'}
        </button>
        <button className="btn" onClick={reset} disabled={!isRunning && secondsLeft === totalSeconds}>
          重置
        </button>
        <button className="btn" onClick={skip}>
          跳过
        </button>
      </div>
    </div>
  )
}
