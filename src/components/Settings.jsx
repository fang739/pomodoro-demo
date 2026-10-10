const DURATION_FIELDS = [
  { key: 'focusMinutes', label: '专注时长', min: 1, max: 120 },
  { key: 'shortBreakMinutes', label: '短休时长', min: 1, max: 60 },
  { key: 'longBreakMinutes', label: '长休时长', min: 1, max: 60 },
]

function Stepper({ value, min, max, onChange }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label="减少">
        −
      </button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label="增加">
        ＋
      </button>
    </div>
  )
}

function Toggle({ checked, onChange, label, desc }) {
  return (
    <div className="toggle-row">
      <div>
        <div className="toggle-label">{label}</div>
        {desc && <div className="toggle-desc">{desc}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-thumb" />
      </button>
    </div>
  )
}

export default function Settings({ settings, onChange, onClose }) {
  const set = (key, value) => onChange({ ...settings, [key]: value })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="设置">
        <div className="modal-head">
          <h3>设置</h3>
          <button className="modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="settings-section">
            <div className="settings-section-title">时长（分钟）</div>
            {DURATION_FIELDS.map((f) => (
              <div key={f.key} className="settings-row">
                <span>{f.label}</span>
                <Stepper
                  value={settings[f.key]}
                  min={f.min}
                  max={f.max}
                  onChange={(v) => set(f.key, v)}
                />
              </div>
            ))}
          </div>

          <div className="settings-section">
            <div className="settings-section-title">节奏</div>
            <div className="settings-row">
              <span>每多少个番茄进入长休</span>
              <Stepper
                value={settings.longBreakInterval}
                min={2}
                max={8}
                onChange={(v) => set('longBreakInterval', v)}
              />
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">自动开始</div>
            <Toggle
              checked={settings.autoStartFocus}
              onChange={(v) => set('autoStartFocus', v)}
              label="休息结束后自动开始专注"
            />
            <Toggle
              checked={settings.autoStartBreaks}
              onChange={(v) => set('autoStartBreaks', v)}
              label="专注结束后自动开始休息"
            />
          </div>

          <div className="settings-section">
            <div className="settings-section-title">提示</div>
            <Toggle
              checked={settings.soundEnabled}
              onChange={(v) => set('soundEnabled', v)}
              label="结束提示音"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
