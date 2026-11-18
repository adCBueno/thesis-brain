import { promptInstall, useCanInstall } from '../lib/pwa'
import { useAppState } from '../lib/store'
import type { View } from '../types'
import { useUI } from '../ui'

export function Nav({ view }: { view: View }) {
  const s = useAppState()
  const { go, open } = useUI()
  const canInstall = useCanInstall()
  const inbox = s.sources.filter((x) => x.status === 'inbox').length
  const items: [View, string, string, string | number][] = [
    ['hoy', '🌤️', 'Hoy', ''],
    ['fuentes', '📚', 'Fuentes', inbox ? `${inbox} 📥` : s.sources.filter((x) => x.status !== 'dropped').length || ''],
    ['fichas', '🗂️', 'Fichas', s.notes.length || ''],
    ['matriz', '🧩', 'Matriz', s.themes.length || ''],
    ['borrador', '✍️', 'Borrador', s.outline.reduce((a, x) => a + x.paras.length, 0) || ''],
    ['rastro', '🧭', 'Rastro', ''],
  ]
  return (
    <nav className="side">
      <div className="brand">
        Thesis Brain<small>tu segundo cerebro de tesis</small>
      </div>
      {items.map(([k, icon, label, count]) => (
        <button key={k} className={'nav-btn' + (view === k ? ' on' : '')} onClick={() => go(k)}>
          <span>{icon}</span>
          <span>{label}</span>
          {count !== '' && <span className="ct">{count}</span>}
        </button>
      ))}
      <div className="side-foot">
        {canInstall && (
          <button className="btn sm primary" style={{ marginBottom: 8 }} onClick={() => void promptInstall()} title="Abrir en su propia ventana, fuera del navegador">
            📲 Instalar app
          </button>
        )}
        <button className="btn sm ghost" onClick={() => open({ kind: 'data' })}>
          ⚙️ Datos y ajustes
        </button>
      </div>
    </nav>
  )
}
