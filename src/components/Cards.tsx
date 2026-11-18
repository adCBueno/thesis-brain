import { useAppState } from '../lib/store'
import { cite, KIND, noteUsed, notesOf, parasUsing, secLabel, sourceById, themeById } from '../lib/utils'
import type { Note, Source } from '../types'
import { useUI } from '../ui'
import { ThemeChip } from './common'

export function SourceCard({ s }: { s: Source }) {
  const st = useAppState()
  const { open } = useUI()
  const nn = notesOf(st, s.id).length
  const used = parasUsing(st, s.id)
  return (
    <div className="item" onClick={() => open({ kind: 'source', id: s.id })}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div>
          <span className="cite">{cite(s)}</span> {s.priority === 3 && '🔥'} {s.kind === 'web' && <span className="meta">🌐</span>}
          <div className="t">{s.title}</div>
          {s.why && <div className="meta">💡 {s.why}</div>}
          <div>
            {s.themeIds.map((id) => (
              <ThemeChip key={id} t={themeById(st, id)} />
            ))}
          </div>
        </div>
        <div className="meta" style={{ flex: '0 0 auto', textAlign: 'right' }}>
          {nn} ficha{nn !== 1 && 's'}
          <br />
          {used.length ? 'en ' + used.map((x) => secLabel(x.si, x.pi)).join(', ') : 'sin usar aún'}
        </div>
      </div>
    </div>
  )
}

export function NoteCard({ n }: { n: Note }) {
  const st = useAppState()
  const { open } = useUI()
  const s = sourceById(st, n.sourceId)
  const [label, cls] = KIND[n.kind] || KIND.para
  return (
    <div className="item" onClick={() => open({ kind: 'note', id: n.id })}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span style={{ flex: '0 0 auto' }}>
          <span className={'badge ' + cls}>{label}</span>
        </span>
        <span className="meta" style={{ textAlign: 'right' }}>
          <span className="cite">{cite(s)}</span>
          {n.loc && ' · ' + n.loc}
          {noteUsed(st, n.id) && ' · ✍️ usada'}
        </span>
      </div>
      <div style={{ marginTop: 6 }}>{n.kind === 'quote' ? `“${n.text}”` : n.text}</div>
      {n.mine && (
        <div className="meta" style={{ marginTop: 4 }}>
          💭 {n.mine}
        </div>
      )}
      <div>
        {n.themeIds.map((id) => (
          <ThemeChip key={id} t={themeById(st, id)} />
        ))}
      </div>
    </div>
  )
}
