// 提示音：用 Web Audio API 合成，无需任何音频资源文件，部署零负担。

let ctx = null

function getCtx() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function playNote(freq, startAt, duration = 0.7, volume = 0.3) {
  const c = getCtx()
  if (!c) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  const t = c.currentTime + startAt
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(volume, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

/** 番茄 / 休息结束的三音提示（C5-E5-G5 上行） */
export function playChime() {
  try {
    ;[523.25, 659.25, 783.99].forEach((freq, i) => playNote(freq, i * 0.18))
  } catch {
    /* 静默失败，绝不阻塞主流程 */
  }
}

/** 任务完成时的短促“叮”声 */
export function playTick() {
  try {
    playNote(880, 0, 0.25, 0.2)
  } catch {
    /* 静默失败 */
  }
}
