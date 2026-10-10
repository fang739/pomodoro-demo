import { useCallback, useEffect, useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTimer } from './hooks/useTimer'
import { KEYS } from './lib/storage'
import { dateKey, formatSeconds } from './lib/time'
import { playChime, playTick } from './lib/sound'
import { generateReview } from './lib/ai'
import Onboarding from './components/Onboarding'
import Timer from './components/Timer'
import TaskList from './components/TaskList'
import StatsPanel from './components/StatsPanel'
import AIPlanner from './components/AIPlanner'
import Settings from './components/Settings'
import Toast from './components/Toast'

const DEFAULT_SETTINGS = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartFocus: false,
  autoStartBreaks: false,
  soundEnabled: true,
}

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 't_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function App() {
  const [settings, setSettings] = useLocalStorage(KEYS.settings, DEFAULT_SETTINGS)
  const [tasks, setTasks] = useLocalStorage(KEYS.tasks, [])
  const [stats, setStats] = useLocalStorage(KEYS.stats, {})
  const [onboardingSeen, setOnboardingSeen] = useLocalStorage(KEYS.onboardingSeen, false)
  const [activeTaskId, setActiveTaskId] = useLocalStorage(KEYS.activeTaskId, null)
  const [showSettings, setShowSettings] = useState(false)
  const [toasts, setToasts] = useState([])

  const notify = useCallback((message, type = 'info') => {
    const id = uid()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200)
  }, [])

  // 阶段自然结束（由 useTimer 回调）：专注 → 记账 + 任务进度；休息 → 提示
  const handlePhaseComplete = useCallback(
    (finishedMode) => {
      if (finishedMode !== 'focus') {
        if (settings.soundEnabled) playChime()
        notify('☕ 休息结束，开始下一个专注吧', 'info')
        return
      }

      const key = dateKey()
      const minutes = settings.focusMinutes

      setStats((prev) => {
        const today = prev[key] || { pomodoros: 0, focusMinutes: 0 }
        return {
          ...prev,
          [key]: { pomodoros: today.pomodoros + 1, focusMinutes: today.focusMinutes + minutes },
        }
      })

      const target = tasks.find((t) => t.id === activeTaskId)
      if (target && !target.done) {
        const completedPomodoros = target.completedPomodoros + 1
        const done = completedPomodoros >= target.estimatedPomodoros
        setTasks((prev) =>
          prev.map((t) => (t.id === activeTaskId ? { ...t, completedPomodoros, done } : t)),
        )
        if (done) {
          if (settings.soundEnabled) playTick()
          notify('🎉 任务完成，干得漂亮！', 'success')
        }
      }

      if (settings.soundEnabled) playChime()
      notify('🍅 专注完成，起来活动一下吧', 'success')
    },
    [settings.focusMinutes, settings.soundEnabled, tasks, activeTaskId, notify, setStats, setTasks],
  )

  const timer = useTimer({ settings, onPhaseComplete: handlePhaseComplete })

  // 标签页标题同步倒计时，切后台也能看到剩余时间
  useEffect(() => {
    const label = timer.mode === 'focus' ? '专注' : timer.mode === 'shortBreak' ? '短休' : '长休'
    document.title = timer.isRunning
      ? `${formatSeconds(timer.secondsLeft)} · ${label} · 番茄工坊`
      : '番茄工坊 · AI 番茄钟工作台'
  }, [timer.secondsLeft, timer.isRunning, timer.mode])

  const addTask = useCallback(
    (title, estimatedPomodoros) => {
      setTasks((prev) => [
        ...prev,
        {
          id: uid(),
          title: title.trim(),
          estimatedPomodoros: Math.min(8, Math.max(1, Math.round(estimatedPomodoros) || 1)),
          completedPomodoros: 0,
          done: false,
          createdAt: Date.now(),
          completedAt: null,
        },
      ])
      notify('已添加任务', 'success')
    },
    [setTasks, notify],
  )

  const addTasks = useCallback(
    (list) => {
      const now = Date.now()
      const items = list.map((t) => ({
        id: uid(),
        title: t.title,
        estimatedPomodoros: Math.min(8, Math.max(1, Math.round(t.estimatedPomodoros) || 1)),
        completedPomodoros: 0,
        done: false,
        createdAt: now,
        completedAt: null,
      }))
      setTasks((prev) => [...prev, ...items])
    },
    [setTasks],
  )

  const toggleTask = useCallback(
    (id) => {
      const target = tasks.find((t) => t.id === id)
      if (!target) return
      const willBeDone = !target.done
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, done: willBeDone, completedAt: willBeDone ? Date.now() : null } : t,
        ),
      )
      if (willBeDone) {
        if (settings.soundEnabled) playTick()
        notify('✅ 任务完成', 'success')
      }
    },
    [tasks, settings.soundEnabled, setTasks, notify],
  )

  const deleteTask = useCallback(
    (id) => {
      setTasks((prev) => prev.filter((t) => t.id !== id))
      if (activeTaskId === id) setActiveTaskId(null)
    },
    [setTasks, activeTaskId, setActiveTaskId],
  )

  const setActiveTask = useCallback(
    (id) => {
      setActiveTaskId((prev) => (prev === id ? null : id))
    },
    [setActiveTaskId],
  )

  const updateEstimate = useCallback(
    (id, delta) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, estimatedPomodoros: Math.min(8, Math.max(1, t.estimatedPomodoros + delta)) }
            : t,
        ),
      )
    },
    [setTasks],
  )

  const finishOnboarding = useCallback(() => setOnboardingSeen(true), [setOnboardingSeen])

  const todayKey = dateKey()
  const today = stats[todayKey] || { pomodoros: 0, focusMinutes: 0 }

  const handleReview = useCallback(
    () => generateReview({ today: stats[dateKey()] || { pomodoros: 0, focusMinutes: 0 }, tasks }),
    [stats, tasks],
  )

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-logo">🍅</span>
          <span className="brand-name">番茄工坊</span>
          <span className="brand-tag">AI 番茄钟工作台</span>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowSettings(true)}>
          ⚙️ 设置
        </button>
      </header>

      <main className="app-main">
        <section className="col col-left">
          <div className="card">
            <Timer timer={timer} settings={settings} />
          </div>
          <div className="card">
            <AIPlanner onAddTasks={addTasks} notify={notify} />
          </div>
        </section>

        <section className="col col-right">
          <div className="card">
            <div className="panel-title">📝 任务列表</div>
            <TaskList
              tasks={tasks}
              activeTaskId={activeTaskId}
              onAdd={addTask}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onSetActive={setActiveTask}
              onUpdateEstimate={updateEstimate}
            />
          </div>

          <div className="card">
            <div className="panel-title">📊 今日统计</div>
            <StatsPanel today={today} stats={stats} onReview={handleReview} />
          </div>
        </section>
      </main>

      {showSettings && (
        <Settings settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} />
      )}

      {!onboardingSeen && <Onboarding onDone={finishOnboarding} />}

      <Toast toasts={toasts} />
    </div>
  )
}
