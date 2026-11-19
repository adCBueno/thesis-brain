import { useState } from 'react'
import { NoteCard } from '../components/Cards'
import { ConfirmButton, Modal, Seg, ThemeChip, ThemePicker } from '../components/common'
import { t } from '../lib/i18n'
import { getState, update, useAppState } from '../lib/store'
import { cite, KIND, setSourceStatus, sourceById, themeById, uid } from '../lib/utils'
import type { Note, NoteKind } from '../types'
import { useUI } from '../ui'

function lastSource(): string {
  const st = getState()
  const last = localStorage.getItem('tb-lastsrc') || ''
  if (last && st.sources.some((s) => s.id === last && s.status !== 'dropped')) return last
  return st.sources.find((s) => s.status === 'reading')?.id || ''
}

export function NoteModal({ id, sourceId, themeId, text: preText, fromTodo }: { id?: string; sourceId?: string; themeId?: string; text?: string; fromTodo?: string }) {
  const st = useAppState()
  const { open, close } = useUI()
  const existing = id ? st.notes.find((n) => n.id === id) : undefined
  const [f, setF] = useState<Note>(() =>
    existing
      ? { ...existing }
      : { id: uid(), sourceId: sourceId ?? lastSource(), loc: '', kind: fromTodo ? 'idea' : 'para', text: preText ?? '', mine: '', themeIds: themeId ? [themeId] : [], created: Date.now() },
  )
  const [err, setErr] = useState(false)
  const set = <K extends keyof Note>(key: K, v: Note[K]) => setF((p) => ({ ...p, [key]: v }))

  const options = st.sources
    .filter((s) => s.status !== 'dropped')
    .sort((a, b) => Number(b.status === 'reading') - Number(a.status === 'reading') || cite(a).localeCompare(cite(b)))

  const save = (again: boolean) => {
    const text = f.text.trim()
    if (!text) {
      setErr(true)
      return
    }
    update((d) => {
      let n = d.notes.find((x) => x.id === f.id)
      const isNew = !n
      if (!n) {
        n = { ...f }
        d.notes.push(n)
      }
      Object.assign(n, { ...f, text, mine: f.mine.trim(), loc: f.loc.trim() })
      const s = d.sources.find((x) => x.id === n!.sourceId)
      if (s) {
        localStorage.setItem('tb-lastsrc', s.id)
        // Taking notes on something means you're reading it.
        if (s.status === 'toread' || s.status === 'inbox') setSourceStatus(s, 'reading')
        n.themeIds.forEach((th) => !s.themeIds.includes(th) && s.themeIds.push(th))
      }
      if (fromTodo) {
        const todo = d.todos.find((x) => x.id === fromTodo)
        if (todo) {
          todo.done = true
          todo.doneAt = Date.now()
        }
      }
      const vars = { s: cite(s), text: `${text.slice(0, 60)}${text.length > 60 ? '…' : ''}` }
      return isNew ? (fromTodo ? t('Idea → ficha de {s}: “{text}”', vars) : t('Ficha de {s}: “{text}”', vars)) : t('Editaste ficha de {s}: “{text}”', vars)
    })
    if (again) open({ kind: 'note', sourceId: f.sourceId })
    else close()
  }

  return (
    <Modal>
      <h2>{existing ? t('Editar ficha') : t('🗂️ Nueva ficha')}</h2>
      <p className="meta" style={{ marginTop: -6 }}>
        {t('Una idea por ficha. Con tus palabras + lo que TÚ piensas: eso es lo que después se vuelve síntesis.')}
      </p>
      <div className="row">
        <div>
          <label className="f">{t('Fuente')}</label>
          <select value={f.sourceId} onChange={(e) => set('sourceId', e.target.value)}>
            <option value="">{t('— Sin fuente (idea mía) —')}</option>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.status === 'reading' ? '👀 ' : ''}
                {cite(s)} — {s.title.slice(0, 55)}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '0 0 140px' }}>
          <label className="f">{t('Pág / sección')}</label>
          <input value={f.loc} onChange={(e) => set('loc', e.target.value)} placeholder={t('p. 4, §3.2')} />
        </div>
      </div>
      <label className="f">{t('Tipo')}</label>
      <Seg<NoteKind> options={(Object.keys(KIND) as NoteKind[]).map((kk) => [kk, t(KIND[kk][0])])} value={f.kind} onChange={(v) => set('kind', v)} />
      <label className="f">{t('La idea')}</label>
      <textarea
        autoFocus
        value={f.text}
        onChange={(e) => set('text', e.target.value)}
        placeholder={t('Qué dice el paper (o qué se te ocurrió)')}
        style={err ? { borderColor: '#c0392b' } : undefined}
      />
      {err && <div className="err">{t('Escribe la idea.')}</div>}
      <label className="f">{t('💭 Mi comentario / cómo lo usaría')}</label>
      <textarea
        value={f.mine}
        onChange={(e) => set('mine', e.target.value)}
        style={{ minHeight: 60 }}
        placeholder={t('¿Coincide con otro autor? ¿Lo contradice? ¿Para qué parte de mi tesis sirve?')}
      />
      <label className="f">{t('Temas')}</label>
      <ThemePicker value={f.themeIds} onChange={(v) => set('themeIds', v)} />
      <div className="mfoot">
        {existing && (
          <ConfirmButton
            onConfirm={() => {
              update((d) => {
                d.notes = d.notes.filter((n) => n.id !== existing.id)
                d.outline.forEach((sec) => sec.paras.forEach((p) => (p.noteIds = p.noteIds.filter((x) => x !== existing.id))))
                return t('Eliminaste una ficha')
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
        {!existing && (
          <button className="btn" onClick={() => save(true)}>
            {t('Guardar y otra')}
          </button>
        )}
        <button className="btn primary" onClick={() => save(false)}>
          {t('Guardar')}
        </button>
      </div>
    </Modal>
  )
}

export function CellModal({ sid, tid }: { sid: string; tid: string }) {
  const st = useAppState()
  const { open, close } = useUI()
  const notes = st.notes.filter((n) => n.sourceId === sid && n.themeIds.includes(tid))
  return (
    <Modal>
      <h2>
        <span className="cite">{cite(sourceById(st, sid))}</span> {t('sobre')} <ThemeChip t={themeById(st, tid)} />
      </h2>
      <div className="list">{notes.length ? notes.map((n) => <NoteCard key={n.id} n={n} />) : <div className="meta">{t('Según tus fichas, esta fuente aún no dice nada sobre este tema.')}</div>}</div>
      <div className="mfoot">
        <button className="btn" onClick={() => open({ kind: 'note', sourceId: sid, themeId: tid })}>
          {t('+ Ficha')}
        </button>
        <span className="sp" />
        <button className="btn ghost" onClick={close}>
          {t('Cerrar')}
        </button>
      </div>
    </Modal>
  )
}
