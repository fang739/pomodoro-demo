import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

function durationOf(mode, settings) {
  if (mode === 'focus') return settings.focusMinutes * 60
  if (mode === 'shortBreak') return settings.shortBreakMinutes * 60
  return settings.longBreakMinutes * 60
}

/**
 * 番茄计时器核心状态机。
 *
 * 实现要点：
 * - 采用"目标结束时间戳"（endAtRef）而非每秒递减计数，
 *   这样即使浏览器切后台 / 节流，恢复时剩余时间依然准确，不会漂移。
 * - 模式切换、长短休轮换（每 longBreakInterval 个番茄一次长休）都在此闭环处理。
 * - 阶段自然结束时回调 onPhaseComplete(finishedMode)，由上层负责记账。
 */
export function useTimer({ settings, onPhaseComplete }) {
  const [mode, setMode] = useState('focus')
  const [secondsLeft, setSecondsLeft] = useState(() => settings.focusMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)

  const endAtRef = useRef(null)
  const modeRef = useRef('focus')
  const focusCountRef = useRef(0) // 当前轮已完成的专注数，用于长休判断
  const isRunningRef = useRef(false)

  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const onCompleteRef = useRef(onPhaseComplete)
  onCompleteRef.current = onPhaseComplete

  const totalSeconds = useMemo(() => durationOf(mode, settings), [mode, settings])

  /** 根据刚结束的阶段，推算出下一阶段 */
  const nextModeAfter = useCallback((finishedMode) => {
    if (finishedMode !== 'focus') return 'focus'
    const interval = settingsRef.current.longBreakInterval || 4
    focusCountRef.current += 1
    return focusCountRef.current % interval === 0 ? 'longBreak' : 'shortBreak'
  }, [])

  /** 阶段自然结束：通知上层记账，并切到下一阶段 */
  const handleComplete = useCallback(() => {
    const finished = modeRef.current
    onCompleteRef.current?.(finished)

    const next = nextModeAfter(finished)
    const s = settingsRef.current
    modeRef.current = next
    setMode(next)
    setSecondsLeft(durationOf(next, s))

    const shouldAutoStart = next === 'focus' ? s.autoStartFocus : s.autoStartBreaks
    if (shouldAutoStart) {
      endAtRef.current = Date.now() + durationOf(next, s) * 1000
      isRunningRef.current = true
      setIsRunning(true)
    } else {
      isRunningRef.current = false
      setIsRunning(false)
    }
  }, [nextModeAfter])

  // 驱动倒计时：isRunning 为 true 时挂 interval
  useEffect(() => {
    if (!isRunning) return undefined
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        clearInterval(id)
        isRunningRef.current = false
        setIsRunning(false)
        handleComplete()
      }
    }, 250)
    return () => clearInterval(id)
  }, [isRunning, handleComplete])

  const start = useCallback(() => {
    if (isRunning) return
    endAtRef.current = Date.now() + secondsLeft * 1000
    isRunningRef.current = true
    setIsRunning(true)
  }, [isRunning, secondsLeft])

  const pause = useCallback(() => {
    isRunningRef.current = false
    setIsRunning(false)
  }, [])

  const reset = useCallback(() => {
    isRunningRef.current = false
    setIsRunning(false)
    setSecondsLeft(durationOf(modeRef.current, settingsRef.current))
  }, [])

  /** 跳过当前阶段（不计入完成数） */
  const skip = useCallback(() => {
    const next = nextModeAfter(modeRef.current)
    modeRef.current = next
    setMode(next)
    isRunningRef.current = false
    setIsRunning(false)
    setSecondsLeft(durationOf(next, settingsRef.current))
  }, [nextModeAfter])

  /** 手动切换模式（Tab 点击） */
  const switchMode = useCallback((next) => {
    modeRef.current = next
    setMode(next)
    isRunningRef.current = false
    setIsRunning(false)
    setSecondsLeft(durationOf(next, settingsRef.current))
  }, [])

  // 时长设置变化时，若处于空闲，则同步刷新当前阶段时长
  const prevSettingsRef = useRef(settings)
  useEffect(() => {
    const prev = prevSettingsRef.current
    const changed =
      settings.focusMinutes !== prev.focusMinutes ||
      settings.shortBreakMinutes !== prev.shortBreakMinutes ||
      settings.longBreakMinutes !== prev.longBreakMinutes
    if (changed && !isRunningRef.current) {
      setSecondsLeft(durationOf(modeRef.current, settings))
    }
    prevSettingsRef.current = settings
  }, [settings])

  return {
    mode,
    secondsLeft,
    totalSeconds,
    isRunning,
    start,
    pause,
    reset,
    skip,
    switchMode,
    // 当前轮已完成专注数（用于展示"X/4 个番茄后长休"）
    focusCountInCycle: focusCountRef.current,
  }
}
