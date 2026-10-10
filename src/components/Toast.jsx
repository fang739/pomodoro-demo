export default function Toast({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type || 'info'}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
