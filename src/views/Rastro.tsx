import { Empty, Head } from '../components/common'
import { useAppState } from '../lib/store'
import { cite, fmtDate, fmtDay, fmtTime } from '../lib/utils'
import type { LogEntry } from '../types'
import { useUI } from '../ui'

export function Rastro() {
  const s = useAppState()
  const { open } = useUI()
  const order = s.sources
    .filter((x) => x.startedAt || x.readAt)
    .sort((a, b) => (a.startedAt || a.readAt || 0) - (b.startedAt || b.readAt || 0))

  const days: { day: string; entries: LogEntry[] }[] = []
  for (const e of s.log) {
    const day = fmtDay(e.t)
    if (!days.length || days[days.length - 1].day !== day) days.push({ day, entries: [] })
    days[days.length - 1].entries.push(e)
  }

  return (
    <>
      <Head title="Rastro" sub="El orden en que leíste, anotaste y escribiste. Para cuando no recuerdas “¿qué leí primero?”." />
      {order.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h2>📖 Orden de lectura</h2>
          <ol style={{ margin: 0, paddingLeft: 22 }}>
            {order.map((x) => (
              <li key={x.id} style={{ padding: '3px 0' }}>
                <span className="cite" style={{ cursor: 'pointer' }} onClick={() => open({ kind: 'source', id: x.id })}>
                  {cite(x)}
                </span>{' '}
                <span className="meta">
                  {x.title.slice(0, 80)}
                  {x.startedAt && ' · empezado ' + fmtDate(x.startedAt)}
                  {x.readAt && ' · terminado ' + fmtDate(x.readAt)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {!s.log.length ? (
        <Empty icon="🧭">Aquí irá apareciendo todo lo que hagas, en orden.</Empty>
      ) : (
        days.map((d) => (
          <div key={d.day}>
            <div className="tl-day">{d.day}</div>
            <div className="tl">
              {d.entries.map((e, i) => (
                <div key={e.t + '-' + i}>
                  <time>{fmtTime(e.t)}</time>
                  {e.m}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  )
}
