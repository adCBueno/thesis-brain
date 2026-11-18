import { Empty, Head, ThemeChip } from '../components/common'
import { useAppState } from '../lib/store'
import { cite, notesOf } from '../lib/utils'
import { useUI } from '../ui'

export function Matriz() {
  const s = useAppState()
  const { open } = useUI()
  const head = <Head title="Matriz de síntesis" sub="Fuentes × temas. Lee por columna y verás el “diálogo” entre autores: eso es tu literature review." />

  if (!s.themes.length || !s.notes.some((n) => n.themeIds.length))
    return (
      <>
        {head}
        <Empty icon="🧩">
          <b>La matriz se arma sola</b> cuando tus fichas tienen temas.
          <br />
          Crea temas al hacer fichas (ej: “definiciones”, “métodos”, “resultados”, “limitaciones / gaps”).
        </Empty>
      </>
    )

  const sources = s.sources.filter((x) => notesOf(s, x.id).some((n) => n.themeIds.length))
  const countFor = (tid: string) => s.notes.filter((n) => n.themeIds.includes(tid)).length
  const gaps = s.themes.filter((t) => countFor(t.id) < 2)

  return (
    <>
      {head}
      <div className="toolbar">
        <span className="meta" style={{ flex: 1 }}>
          Clic en un <b>tema</b> para juntar sus fichas y convertirlas en párrafo. Clic en una <b>celda</b> para ver qué dice esa fuente.
        </span>
        <button className="btn sm" onClick={() => open({ kind: 'themes' })}>
          Editar temas
        </button>
      </div>
      <div className="mx-wrap">
        <table className="mx">
          <thead>
            <tr>
              <th style={{ cursor: 'default' }}>Fuente</th>
              {s.themes.map((t) => (
                <th key={t.id} onClick={() => open({ kind: 'theme', id: t.id })}>
                  <ThemeChip t={t} /> <span className="meta">{countFor(t.id)} · escribir →</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sources.map((src) => (
              <tr key={src.id}>
                <td>
                  <span className="cite" style={{ cursor: 'pointer' }} onClick={() => open({ kind: 'source', id: src.id })}>
                    {cite(src)}
                  </span>
                  <div className="meta">{src.title.slice(0, 70)}</div>
                </td>
                {s.themes.map((t) => {
                  const ns = s.notes.filter((n) => n.sourceId === src.id && n.themeIds.includes(t.id))
                  return (
                    <td key={t.id} className={'cell' + (ns.length ? ' has' : '')} onClick={() => open({ kind: 'cell', sid: src.id, tid: t.id })}>
                      {ns.length > 0 && (
                        <>
                          <span className="n">{ns.length}</span>{' '}
                          <span className="meta">
                            {ns[0].text.slice(0, 70)}
                            {ns[0].text.length > 70 && '…'}
                          </span>
                        </>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {gaps.length > 0 && (
        <div className="tip">
          🔍 Temas con poca evidencia (menos de 2 fichas): <b>{gaps.map((t) => t.name).join(', ')}</b>. ¿Necesitas leer más ahí, o no es tan central?
        </div>
      )}
    </>
  )
}
