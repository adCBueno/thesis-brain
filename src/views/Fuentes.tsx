import { useState } from 'react'
import { SourceCard } from '../components/Cards'
import { Empty, Head, usePersisted } from '../components/common'
import { rich, t, tp } from '../lib/i18n'
import { update, useAppState } from '../lib/store'
import { cite, setSourceStatus, STATUS } from '../lib/utils'
import type { Source, Status } from '../types'
import { useUI } from '../ui'

function InboxRow({ s }: { s: Source }) {
  const { open } = useUI()
  const [why, setWhy] = useState(s.why)
  const [pri, setPri] = useState(2)
  const triage = () =>
    update((d) => {
      const x = d.sources.find((y) => y.id === s.id)
      if (!x) return
      x.why = why.trim()
      x.priority = pri
      x.status = 'toread'
      return t('Clasificaste {s} → Por leer', { s: cite(x) })
    })
  const drop = () => update((d) => setSourceStatus(d.sources.find((y) => y.id === s.id)!, 'dropped'))
  return (
    <div className="inbox-row">
      <div>
        {s.url ? (
          <a href={s.url} target="_blank" rel="noopener noreferrer">
            {s.title}
          </a>
        ) : (
          s.title
        )}
        <div className="meta">{s.kind === 'paper' ? t('📄 paper') : t('🌐 web')}</div>
      </div>
      <input value={why} onChange={(e) => setWhy(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && triage()} placeholder={t('¿Por qué la abrí? ¿Para qué me sirve?')} />
      <select value={pri} onChange={(e) => setPri(Number(e.target.value))}>
        <option value={3}>{t('🔥 Alta')}</option>
        <option value={2}>{t('Media')}</option>
        <option value={1}>{t('Baja')}</option>
      </select>
      <div className="row" style={{ gap: 4 }}>
        <button className="btn sm primary" onClick={triage}>
          {t('→ Por leer')}
        </button>
        <button className="btn sm ghost" title={t('Editar detalles')} onClick={() => open({ kind: 'source', id: s.id })}>
          ✎
        </button>
        <button className="btn sm ghost" title={t('Descartar')} onClick={drop}>
          🗑️
        </button>
      </div>
    </div>
  )
}

const GROUPS: Status[] = ['reading', 'toread', 'read', 'done']

export function Fuentes() {
  const s = useAppState()
  const { open } = useUI()
  const [q, setQ] = usePersisted('tb-q-src', '')
  const ql = q.toLowerCase()
  const match = (x: Source) => !ql || [x.title, x.authors, x.why, x.url].join(' ').toLowerCase().includes(ql)
  const inbox = s.sources.filter((x) => x.status === 'inbox' && match(x))
  const dropped = s.sources.filter((x) => x.status === 'dropped').length

  return (
    <>
      <Head title={t('Fuentes')} sub={t('Todo lo que tenías en pestañas, en un solo sitio. Ciérralas sin miedo.')} />
      <div className="toolbar">
        <button className="btn primary" onClick={() => open({ kind: 'bulk' })}>
          {t('🧹 Vaciar tabs (pegar varios)')}
        </button>
        <button className="btn" onClick={() => open({ kind: 'source' })}>
          {t('+ Fuente')}
        </button>
        <input type="search" placeholder={t('Buscar…')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {!s.sources.length ? (
        <Empty icon="🗂️">
          {rich('<b>Empieza aquí:</b> copia los links (o títulos) de todas tus pestañas y pégalos juntos.')}
          <br />
          {t('Después los clasificas de a poco.')}
          <div style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={() => open({ kind: 'bulk' })}>
              {t('Pegar mis tabs')}
            </button>
          </div>
        </Empty>
      ) : (
        <>
          {inbox.length > 0 && (
            <div className="card" style={{ marginBottom: 8 }}>
              <h2>
                {t('📥 Bandeja')} <span className="count">{inbox.length}</span>
              </h2>
              <p className="meta" style={{ margin: '0 0 6px' }}>
                {t('Por cada una: ¿por qué la abriste? Una línea basta. Luego mándala a “Por leer” o descártala sin culpa.')}
              </p>
              {inbox.map((x) => (
                <InboxRow key={x.id} s={x} />
              ))}
            </div>
          )}
          {GROUPS.map((g) => {
            const list = s.sources.filter((x) => x.status === g && match(x))
            if (g === 'toread') list.sort((a, b) => b.priority - a.priority || a.added - b.added)
            if (!list.length) return null
            return (
              <div key={g}>
                <div className="section-h">
                  <h2>
                    {STATUS[g][0]} {t(STATUS[g][1])}
                  </h2>
                  <span className="count">{list.length}</span>
                </div>
                <div className="list">
                  {list.map((x) => (
                    <SourceCard key={x.id} s={x} />
                  ))}
                </div>
              </div>
            )
          })}
          {dropped > 0 && (
            <p className="meta" style={{ marginTop: 20 }}>
              🗑️ {tp(dropped, '{n} descartada', '{n} descartadas')}{' '}
              <button className="btn sm ghost" onClick={() => open({ kind: 'dropped' })}>
                {t('ver')}
              </button>
            </p>
          )}
        </>
      )}
    </>
  )
}
