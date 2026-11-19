import { LANGS, setLang, t, useLang, type Lang } from '../lib/i18n'
import { promptInstall, useCanInstall } from '../lib/pwa'
import { useAppState } from '../lib/store'
import type { View } from '../types'
import { useUI } from '../ui'

export function Nav({ view }: { view: View }) {
  const s = useAppState()
  const { go, open } = useUI()
  const canInstall = useCanInstall()
  const lang = useLang()
  const inbox = s.sources.filter((x) => x.status === 'inbox').length
  const items: [View, string, string, string | number][] = [
    ['hoy', '🌤️', t('Hoy'), ''],
    ['pendientes', '✅', t('Pendientes'), s.todos.filter((t) => !t.done).length || ''],
    ['fuentes', '📚', t('Fuentes'), inbox ? `${inbox} 📥` : s.sources.filter((x) => x.status !== 'dropped').length || ''],
    ['fichas', '🗂️', t('Fichas'), s.notes.length || ''],
    ['matriz', '🧩', t('Matriz'), s.themes.length || ''],
    ['borrador', '✍️', t('Borrador'), s.outline.reduce((a, x) => a + x.paras.length, 0) || ''],
    ['rastro', '🧭', t('Rastro'), ''],
  ]
  return (
    <nav className="side">
      <div className="brand">
        Thesis Brain<small>{t('tu segundo cerebro de tesis')}</small>
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
          <button className="btn sm primary" style={{ marginBottom: 8 }} onClick={() => void promptInstall()} title={t('Abrir en su propia ventana, fuera del navegador')}>
            {t('📲 Instalar app')}
          </button>
        )}
        <button className="btn sm ghost" onClick={() => open({ kind: 'data' })}>
          {t('⚙️ Datos y ajustes')}
        </button>
        <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t('Idioma')} title={t('Idioma')}>
          {(Object.keys(LANGS) as Lang[]).map((l) => (
            <option key={l} value={l}>
              {LANGS[l].flag} {LANGS[l].label}
            </option>
          ))}
        </select>
      </div>
    </nav>
  )
}
