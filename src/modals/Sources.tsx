import { useState } from 'react'
import { NoteCard } from '../components/Cards'
import { ConfirmButton, Modal, ThemePicker } from '../components/common'
import { k, t } from '../lib/i18n'
import { update, useAppState } from '../lib/store'
import { cite, notesOf, parasUsing, parseLine, secLabel, setSourceStatus, STATUS, uid } from '../lib/utils'
import type { Source, Status } from '../types'
import { useUI } from '../ui'

function newSource(): Source {
  return { id: uid(), title: '', authors: '', year: '', url: '', kind: 'paper', status: 'toread', why: '', priority: 2, themeIds: [], added: Date.now() }
}

const MARK: Record<string, string> = { reading: k('👀 Marcar leyendo'), read: k('✅ Marcar leído'), done: k('🧩 Marcar sintetizado') }

export function SourceModal({ id }: { id?: string }) {
  const st = useAppState()
  const { open, close } = useUI()
  const existing = id ? st.sources.find((x) => x.id === id) : undefined
  const [f, setF] = useState<Source>(() => (existing ? { ...existing } : newSource()))
  const [err, setErr] = useState(false)
  const set = <K extends keyof Source>(key: K, v: Source[K]) => setF((p) => ({ ...p, [key]: v }))

  // The source was deleted while this modal was open.
  if (id && !existing) return null

  const save = (statusOverride?: Status) => {
    if (!f.title.trim()) {
      setErr(true)
      return
    }
    update((d) => {
      let x = d.sources.find((y) => y.id === f.id)
      const isNew = !x
      if (!x) {
        x = { ...f, status: 'toread' }
        d.sources.unshift(x)
      }
      const { status, startedAt: _s, readAt: _r, ...rest } = f
      Object.assign(x, { ...rest, title: f.title.trim(), authors: f.authors.trim(), year: f.year.trim(), url: f.url.trim(), why: f.why.trim() })
      const msg = setSourceStatus(x, statusOverride || status)
      return msg || (isNew ? t('Añadiste {s}', { s: cite(x) }) : t('Editaste {s}', { s: cite(x) }))
    })
    close()
  }

  const notes = id ? notesOf(st, id) : []
  const used = id ? parasUsing(st, id) : []

  return (
    <Modal>
      <div className="row">
        <h2 style={{ margin: 0 }}>{existing ? <span className="cite">{cite(existing)}</span> : t('Nueva fuente')}</h2>
        {existing?.url && (
          <a href={existing.url} target="_blank" rel="noopener noreferrer" className="btn sm" style={{ flex: '0 0 auto' }}>
            {t('Abrir ↗')}
          </a>
        )}
      </div>
      {existing && (
        <div className="toolbar" style={{ margin: '12px 0 0' }}>
          {(['reading', 'read', 'done'] as Status[])
            .filter((s) => s !== existing.status)
            .map((s) => (
              <button key={s} className="btn sm" onClick={() => save(s)}>
                {t(MARK[s])}
              </button>
            ))}
        </div>
      )}
      <label className="f">{t('Título')}</label>
      <input value={f.title} onChange={(e) => set('title', e.target.value)} autoFocus={!existing} style={err ? { borderColor: '#c0392b' } : undefined} />
      {err && <div className="err">{t('El título es obligatorio.')}</div>}
      <div className="row">
        <div>
          <label className="f">{t('Autores')}</label>
          <input value={f.authors} onChange={(e) => set('authors', e.target.value)} placeholder="Smith, J.; Doe, A." />
        </div>
        <div style={{ flex: '0 0 100px' }}>
          <label className="f">{t('Año')}</label>
          <input value={f.year} onChange={(e) => set('year', e.target.value)} />
        </div>
      </div>
      <label className="f">{t('Link')}</label>
      <input value={f.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…" />
      <div className="row">
        <div>
          <label className="f">{t('Estado')}</label>
          <select value={f.status} onChange={(e) => set('status', e.target.value as Status)}>
            {(Object.keys(STATUS) as Status[]).map((s) => (
              <option key={s} value={s}>
                {STATUS[s][0]} {t(STATUS[s][1])}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="f">{t('Tipo')}</label>
          <select value={f.kind} onChange={(e) => set('kind', e.target.value as Source['kind'])}>
            <option value="paper">{t('📄 Paper')}</option>
            <option value="web">{t('🌐 Web / recurso')}</option>
          </select>
        </div>
        <div>
          <label className="f">{t('Prioridad')}</label>
          <select value={f.priority} onChange={(e) => set('priority', Number(e.target.value))}>
            <option value={3}>{t('🔥 Alta')}</option>
            <option value={2}>{t('Media')}</option>
            <option value={1}>{t('Baja')}</option>
          </select>
        </div>
      </div>
      <label className="f">{t('¿Por qué me importa?')}</label>
      <input value={f.why} onChange={(e) => set('why', e.target.value)} placeholder={t('Ej: define el framework que voy a usar en la metodología')} />
      <label className="f">{t('Temas')}</label>
      <ThemePicker value={f.themeIds} onChange={(v) => set('themeIds', v)} />

      {existing && (
        <>
          <div className="section-h">
            <h2>{t('🗂️ Fichas')}</h2>
            <span className="count">{notes.length}</span>
            <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => open({ kind: 'note', sourceId: existing.id })}>
              {t('+ Ficha')}
            </button>
          </div>
          {notes.length ? (
            <div className="list">
              {notes.map((n) => (
                <NoteCard key={n.id} n={n} />
              ))}
            </div>
          ) : (
            <div className="meta">{t('Sin fichas aún.')}</div>
          )}
          <div className="section-h">
            <h2>{t('✍️ Usada en el borrador')}</h2>
          </div>
          {used.length ? (
            used.map((x) => (
              <div key={x.si + '-' + x.pi} className="meta">
                • <b>{secLabel(x.si, x.pi)}</b> {x.title}: “{(x.text || t('(vacío)')).slice(0, 90)}…”
              </div>
            ))
          ) : (
            <div className="meta">{t('Todavía en ningún párrafo.')}</div>
          )}
        </>
      )}

      <div className="mfoot">
        {existing && (
          <ConfirmButton
            onConfirm={() => {
              update((d) => {
                const nids = d.notes.filter((n) => n.sourceId === existing.id).map((n) => n.id)
                d.notes = d.notes.filter((n) => n.sourceId !== existing.id)
                d.outline.forEach((sec) =>
                  sec.paras.forEach((p) => {
                    p.noteIds = p.noteIds.filter((x) => !nids.includes(x))
                    p.sourceIds = p.sourceIds.filter((x) => x !== existing.id)
                  }),
                )
                d.sources = d.sources.filter((x) => x.id !== existing.id)
                return t('Eliminaste {s}', { s: cite(existing) })
              })
              close()
            }}
          >
            {t('Eliminar')}
          </ConfirmButton>
        )}
        <span className="sp" />
        <button className="btn ghost" onClick={close}>
          {t('Cancelar')}
        </button>
        <button className="btn primary" onClick={() => save()}>
          {t('Guardar')}
        </button>
      </div>
    </Modal>
  )
}

export function BulkModal() {
  const { close, go } = useUI()
  const [text, setText] = useState('')
  const save = () => {
    let added = 0
    update((d) => {
      const seen = new Set(d.sources.map((s) => s.url).filter(Boolean))
      text.split('\n').forEach((line, i) => {
        const s = parseLine(line)
        if (!s || (s.url && seen.has(s.url))) return
        if (s.url) seen.add(s.url)
        s.added = Date.now() + i
        d.sources.push(s)
        added++
      })
      return added ? (added === 1 ? t('Vaciaste 1 pestaña a la bandeja 🧹') : t('Vaciaste {n} pestañas a la bandeja 🧹', { n: added })) : null
    })
    close()
    go('fuentes')
  }
  return (
    <Modal>
      <h2>{t('🧹 Vaciar tabs')}</h2>
      <p className="meta">
        {t(
          'Pega links o títulos, uno por línea. Truco: en Chrome selecciona todas las pestañas (clic en la primera, Shift+clic en la última) y usa una extensión tipo “Copy All URLs”. Los duplicados se ignoran.',
        )}
      </p>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ minHeight: 220 }}
        placeholder={'https://arxiv.org/abs/2401.00001\nhttps://dl.acm.org/doi/10.1145/...\nA Survey on Requirements Engineering (2022)'}
      />
      <div className="mfoot">
        <button className="btn ghost" onClick={close}>
          {t('Cancelar')}
        </button>
        <button className="btn primary" onClick={save}>
          {t('Añadir a la bandeja')}
        </button>
      </div>
    </Modal>
  )
}

export function DroppedModal() {
  const st = useAppState()
  const { close } = useUI()
  const list = st.sources.filter((x) => x.status === 'dropped')
  return (
    <Modal>
      <h2>{t('🗑️ Descartadas')}</h2>
      <div className="list">
        {list.length ? (
          list.map((x) => (
            <div key={x.id} className="row">
              <div>
                <span className="cite">{cite(x)}</span> {x.title}
              </div>
              <button
                className="btn sm"
                style={{ flex: '0 0 auto' }}
                onClick={() =>
                  update((d) => {
                    const s = d.sources.find((y) => y.id === x.id)!
                    s.status = 'inbox'
                    return t('Recuperaste {s}', { s: cite(s) })
                  })
                }
              >
                {t('Recuperar')}
              </button>
            </div>
          ))
        ) : (
          <div className="meta">{t('Nada por aquí.')}</div>
        )}
      </div>
      <div className="mfoot">
        <button className="btn ghost" onClick={close}>
          {t('Cerrar')}
        </button>
      </div>
    </Modal>
  )
}
