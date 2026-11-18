import { NoteCard } from '../components/Cards'
import { Empty, Head, usePersisted } from '../components/common'
import { useAppState } from '../lib/store'
import { cite, noteUsed, notesOf, sourceById } from '../lib/utils'
import { useUI } from '../ui'

export function Fichas() {
  const s = useAppState()
  const { open } = useUI()
  const [q, setQ] = usePersisted('tb-q-note', '')
  const [fTheme, setFTheme] = usePersisted('tb-f-theme', '')
  const [fSource, setFSource] = usePersisted('tb-f-source', '')
  const [fUnused, setFUnused] = usePersisted('tb-f-unused', false)
  const ql = q.toLowerCase()
  const list = s.notes
    .filter(
      (n) =>
        (!fTheme || n.themeIds.includes(fTheme)) &&
        (!fSource || n.sourceId === fSource) &&
        (!fUnused || !noteUsed(s, n.id)) &&
        (!ql || [n.text, n.mine, n.loc, cite(sourceById(s, n.sourceId))].join(' ').toLowerCase().includes(ql)),
    )
    .sort((a, b) => b.created - a.created)

  return (
    <>
      <Head title="Fichas" sub="Cada idea que sacas de un paper, con su fuente y página. Nunca más “¿de dónde saqué esto?”." />
      <div className="toolbar">
        <button className="btn primary" onClick={() => open({ kind: 'note' })}>
          + Ficha
        </button>
        <input type="search" placeholder="Buscar en fichas…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={fTheme} onChange={(e) => setFTheme(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">Todos los temas</option>
          {s.themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select value={fSource} onChange={(e) => setFSource(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="">Todas las fuentes</option>
          {s.sources
            .filter((x) => notesOf(s, x.id).length)
            .map((x) => (
              <option key={x.id} value={x.id}>
                {cite(x)}
              </option>
            ))}
        </select>
        <label className="meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={fUnused} onChange={(e) => setFUnused(e.target.checked)} /> solo sin usar
        </label>
      </div>
      {!s.notes.length ? (
        <Empty icon="✍️">
          <b>Mientras lees, captura.</b> Usa <b>✚ Ficha</b> (abajo a la derecha, o la tecla <span className="kbd">N</span>) cada vez que algo te sirva.
          <br />
          Fuente + página + tu idea. Un minuto.
        </Empty>
      ) : (
        <>
          <p className="meta">
            {list.length} ficha{list.length !== 1 && 's'}
          </p>
          <div className="grid g2">
            {list.map((n) => (
              <NoteCard key={n.id} n={n} />
            ))}
          </div>
        </>
      )}
    </>
  )
}
