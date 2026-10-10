import { useState } from 'react'

function TaskItem({ task, isActive, onToggle, onDelete, onSetActive, onUpdateEstimate }) {
  return (
    <li className={`task-item ${task.done ? 'done' : ''} ${isActive ? 'active' : ''}`}>
      <button
        className="task-check"
        onClick={() => onToggle(task.id)}
        aria-label={task.done ? '标记为未完成' : '标记为完成'}
        aria-pressed={task.done}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
      </button>

      <div className="task-body">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          <span className="task-tomato">🍅 {task.completedPomodoros}/{task.estimatedPomodoros}</span>
          <span className="task-est">
            <button onClick={() => onUpdateEstimate(task.id, -1)} aria-label="减少预估番茄数">
              −
            </button>
            <button onClick={() => onUpdateEstimate(task.id, 1)} aria-label="增加预估番茄数">
              ＋
            </button>
          </span>
        </div>
      </div>

      <div className="task-actions">
        {!task.done && (
          <button
            className={`task-focus ${isActive ? 'on' : ''}`}
            onClick={() => onSetActive(task.id)}
            title={isActive ? '当前专注任务' : '设为当前专注任务'}
            aria-label="设为当前专注任务"
          >
            {isActive ? '●' : '○'}
          </button>
        )}
        <button className="task-delete" onClick={() => onDelete(task.id)} aria-label="删除任务">
          ×
        </button>
      </div>
    </li>
  )
}

export default function TaskList({
  tasks,
  activeTaskId,
  onAdd,
  onToggle,
  onDelete,
  onSetActive,
  onUpdateEstimate,
  onClearDone,
}) {
  const [title, setTitle] = useState('')
  const [estimate, setEstimate] = useState(1)

  const submit = (e) => {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    onAdd(t, estimate)
    setTitle('')
    setEstimate(1)
  }

  const active = tasks.filter((t) => !t.done)
  const finished = tasks.filter((t) => t.done)

  return (
    <div className="task-list">
      <form className="task-add" onSubmit={submit}>
        <input
          className="task-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="添加一个任务，回车确认…"
          maxLength={60}
        />
        <div className="task-add-est">
          <button
            type="button"
            onClick={() => setEstimate((n) => Math.max(1, n - 1))}
            aria-label="减少预估番茄数"
          >
            −
          </button>
          <span>{estimate}</span>
          <button
            type="button"
            onClick={() => setEstimate((n) => Math.min(8, n + 1))}
            aria-label="增加预估番茄数"
          >
            ＋
          </button>
        </div>
        <button className="btn btn-primary" type="submit" disabled={!title.trim()}>
          添加
        </button>
      </form>

      {tasks.length === 0 ? (
        <div className="task-empty">
          <div className="task-empty-icon">🌱</div>
          <p>还没有任务，先添加一个，或用上面的 AI 帮你拆解目标。</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <ul className="task-group">
              {active.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  isActive={t.id === activeTaskId}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onSetActive={onSetActive}
                  onUpdateEstimate={onUpdateEstimate}
                />
              ))}
            </ul>
          )}
          {finished.length > 0 && (
            <div className="task-finished-head">
              <span>已完成 {finished.length}</span>
              <button className="task-clear-done" onClick={onClearDone}>
                清空
              </button>
            </div>
          )}
          {finished.length > 0 && (
            <ul className="task-group task-group-finished">
              {finished.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  isActive={false}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onSetActive={onSetActive}
                  onUpdateEstimate={onUpdateEstimate}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
