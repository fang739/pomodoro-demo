import { useState } from 'react'

const STEPS = [
  {
    icon: '🍅',
    title: '欢迎来到番茄工坊',
    desc: '一个 AI 驱动的番茄钟工作台：用 25 分钟专注 + 5 分钟休息的节奏，把大目标拆成一个个可完成的小番茄。',
  },
  {
    icon: '🧩',
    title: 'AI 帮你拆目标',
    desc: '描述一个目标，AI 会把它拆成 3~5 个可执行的番茄任务，每个任务还能预估需要几个番茄。',
  },
  {
    icon: '📊',
    title: '专注看得见',
    desc: '完成的番茄和专注时长都会记录在案，还能生成今日复盘和最近 7 天的专注统计。',
  },
]

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const last = step === STEPS.length - 1
  const s = STEPS[step]

  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-label="新手引导">
      <div className="onboarding-card">
        <button className="onboarding-skip" onClick={onDone}>
          跳过
        </button>

        <div className="onboarding-icon">{s.icon}</div>
        <h2 className="onboarding-title">{s.title}</h2>
        <p className="onboarding-desc">{s.desc}</p>

        <div className="onboarding-dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={`dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>

        <div className="onboarding-actions">
          {step > 0 && (
            <button className="btn" onClick={() => setStep(step - 1)}>
              上一步
            </button>
          )}
          <button className="btn btn-primary" onClick={() => (last ? onDone() : setStep(step + 1))}>
            {last ? '开始专注' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  )
}
