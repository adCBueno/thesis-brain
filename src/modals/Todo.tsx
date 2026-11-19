import { useState } from 'react'
import { ConfirmButton, Modal, Seg } from '../components/common'
import { rich, t } from '../lib/i18n'
import { update, useAppState } from '../lib/store'
import { addDaysISO, cite, uid } from '../lib/utils'
import type { Todo, TodoKind } from '../types'
import { useUI } from '../ui'
import { todoLogText } from '../views/Pendientes'

export function TodoModal({ id }: { id?: string }) {
  const st = useAppState()
  const { close, open } = useUI()
  const existing = id ? st.todos.find((x) => x.id === id) : undefined
  const [f, setF] = useState<Todo>(
    () => existing ?? { id: uid(), text: '', kind: 'todo', done: false, important: false, due: '', sourceId: '', sectionId: '', created: Date.now() },
  )
  const [details, setDetails] = useState(!!existing)
  const set = <K extends keyof Todo>(key: K, v: Todo[K]) => setF((p) => ({ ...p, [key]: v }))
  if (id && !existing) return null

  const save = () => {
    const text = f.text.trim()
    if (!text) return
    update((d) => {
      const i = d.todos.findIndex((x) => x.id === f.id)
      const item = { ...f, text }
      if (i >= 0) d.todos[i] = item
      else d.todos.push(item)
      return i >= 0 ? null : todoLogText(item.kind, text)
    })
    close()
  }

  return (
    <Modal>
      <h2>{existing ? (f.kind === 'idea' ? t('Idea') : t('Pendiente')) : t('Anotar rápido')}</h2>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div style={{ flex: '0 0 auto' }}>
          <Seg<TodoKind>
            options={[
              ['todo', t('✅ Pendiente')],
              ['idea', t('💡 Idea')],
            ]}
            value={f.kind}
            onChange={(v) => set('kind', v)}
          />
        </div>
        <label className="meta" style={{ display: 'flex', gap: 6, alignItems: 'center', flex: '0 0 auto' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={f.important} onChange={(e) => set('important', e.target.checked)} /> {t('⭐ importante')}
        </label>
      </div>
      <textarea
        autoFocus
        value={f.text}
        onChange={(e) => set('text', e.target.value)}
        onKeyDown={(e) => {
          // Enter saves; Shift+Enter makes a new line.
          if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            save()
          }
        }}
        style={{ minHeight: 80, marginTop: 12 }}
        placeholder={f.kind === 'idea' ? t('Ej: comparar mis resultados con lo que dice Smith sobre X…') : t('Ej: pedirle feedback a mi supervisor sobre la metodología')}
      />
      <div className="meta" style={{ marginTop: 4 }}>
        {rich('<kbd>Enter</kbd> guardar · <kbd>Shift + Enter</kbd> nueva línea')}
      </div>

      {!details ? (
        <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => setDetails(true)}>
          {t('+ fecha o relacionar con una fuente / sección')}
        </button>
      ) : (
        <>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label className="f">{t('Para cuándo')}</label>
              <input type="date" value={f.due} onChange={(e) => set('due', e.target.value)} />
            </div>
            <div style={{ flex: '0 0 auto', alignSelf: 'flex-end', display: 'flex', gap: 4 }}>
              <button className="btn sm ghost" onClick={() => set('due', addDaysISO(0))}>
                {t('Hoy')}
              </button>
              <button className="btn sm ghost" onClick={() => set('due', addDaysISO(1))}>
                {t('Mañana')}
              </button>
              <button className="btn sm ghost" onClick={() => set('due', addDaysISO(7))}>
                {t('+1 sem')}
              </button>
              {f.due && (
                <button className="btn sm ghost" onClick={() => set('due', '')}>
                  {t('Sin fecha')}
                </button>
              )}
            </div>
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px' }}>
              <label className="f">{t('Fuente relacionada')}</label>
              <select value={f.sourceId} onChange={(e) => set('sourceId', e.target.value)}>
                <option value="">—</option>
                {st.sources
                  .filter((s) => s.status !== 'dropped')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {cite(s)} — {s.title.slice(0, 50)}
                    </option>
                  ))}
              </select>
            </div>
            <div style={{ flex: '1 1 220px' }}>
              <label className="f">{t('Sección del borrador')}</label>
              <select value={f.sectionId} onChange={(e) => set('sectionId', e.target.value)}>
                <option value="">—</option>
                {st.outline.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    §{i + 1} {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      <div className="mfoot">
        {existing && (
          <ConfirmButton
            onConfirm={() => {
              update((d) => void (d.todos = d.todos.filter((x) => x.id !== existing.id)))
              close()
            }}
          >
            {t('Eliminar')}
          </ConfirmButton>
        )}
        {existing && f.kind === 'idea' && !existing.done && (
          <button className="btn ghost" onClick={() => open({ kind: 'note', text: f.text, sourceId: f.sourceId || undefined, fromTodo: f.id })} title={t('Convertir en ficha')}>
            {t('→ Ficha')}
          </button>
        )}
        <span className="sp" />
        <button className="btn ghost" onClick={close}>
          {t('Cancelar')}
        </button>
        <button className="btn primary" onClick={save}>
          {t('Guardar')}
        </button>
      </div>
    </Modal>
  )
}
