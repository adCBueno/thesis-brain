import { useState } from 'react'
import { Empty, Head, Seg, usePersisted } from '../components/common'
import { update, useAppState } from '../lib/store'
import { cite, isoDate, relDay, sourceById, todoSort, uid } from '../lib/utils'
import type { Todo, TodoKind } from '../types'
import { useUI } from '../ui'

type Filter = 'all' | TodoKind

export function toggleTodo(id: string) {
  update((d) => {
    const t = d.todos.find((x) => x.id === id)
    if (!t) return
    t.done = !t.done
    t.doneAt = t.done ? Date.now() : undefined
    return t.done ? `✓ ${t.text.slice(0, 70)}` : null
  })
}

export function TodoRow({ t }: { t: Todo }) {
  const s = useAppState()
  const { open } = useUI()
  const today = isoDate()
  const src = sourceById(s, t.sourceId)
  const si = s.outline.findIndex((x) => x.id === t.sectionId)
  const overdue = !t.done && t.due && t.due < today
  return (
    <div className={'todo-row' + (t.done ? ' done' : '')}>
      <input type="checkbox" className="todo-check" checked={t.done} onChange={() => toggleTodo(t.id)} title={t.done ? 'Marcar como pendiente' : 'Marcar como hecho'} />
      <div className="todo-body" onClick={() => open({ kind: 'todo', id: t.id })}>
        <div className="todo-text">
          {t.kind === 'idea' && '💡 '}
          {t.text}
        </div>
        {(t.due || src || si >= 0) && (
          <div className="meta">
            {t.due && <span className={overdue ? 'overdue' : t.due === today && !t.done ? 'due-today' : ''}>📅 {relDay(t.due)}</span>}
            {src && <span> · 📄 {cite(src)}</span>}
            {si >= 0 && (
              <span>
                {' '}
                · ✍️ §{si + 1} {s.outline[si].title}
              </span>
            )}
          </div>
        )}
      </div>
      {!t.done && (
        <div className="todo-actions">
          {t.kind === 'idea' && (
            <>
              <button className="btn sm ghost" title="Convertir en ficha" onClick={() => open({ kind: 'note', text: t.text, sourceId: t.sourceId || undefined, fromTodo: t.id })}>
                → Ficha
              </button>
              <button className="btn sm ghost" title="Convertir en pendiente" onClick={() => update((d) => void (d.todos.find((x) => x.id === t.id)!.kind = 'todo'))}>
                → Pendiente
              </button>
            </>
          )}
          <button
            className={'btn sm ghost star' + (t.important ? ' on' : '')}
            title={t.important ? 'Quitar importante' : 'Marcar como importante'}
            onClick={() => update((d) => void (d.todos.find((x) => x.id === t.id)!.important = !t.important))}
          >
            {t.important ? '⭐' : '☆'}
          </button>
        </div>
      )}
    </div>
  )
}

export function Pendientes() {
  const s = useAppState()
  const [filter, setFilter] = usePersisted<Filter>('tb-todo-filter', 'all')
  const [kind, setKind] = usePersisted<TodoKind>('tb-todo-kind', 'todo')
  const [text, setText] = useState('')
  const [showDone, setShowDone] = useState(false)

  const add = () => {
    const t = text.trim()
    if (!t) return
    update(
      (d) =>
        void d.todos.push({ id: uid(), text: t, kind, done: false, important: false, due: '', sourceId: '', sectionId: '', created: Date.now() }),
      `${kind === 'idea' ? '💡 Idea' : '✅ Pendiente'}: “${t.slice(0, 60)}${t.length > 60 ? '…' : ''}”`,
    )
    setText('')
  }

  const list = s.todos.filter((t) => filter === 'all' || t.kind === filter).sort(todoSort)
  const open = list.filter((t) => !t.done)
  const done = list.filter((t) => t.done)

  return (
    <>
      <Head title="Pendientes" sub="Anota ideas y pendientes al vuelo, sin salir de lo que estás haciendo. Desde cualquier vista: tecla T." />
      <div className="card capture">
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div style={{ flex: '0 0 auto' }}>
            <Seg<TodoKind>
              options={[
                ['todo', '✅ Pendiente'],
                ['idea', '💡 Idea'],
              ]}
              value={kind}
              onChange={setKind}
            />
          </div>
          <input
            className="capture-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            placeholder={kind === 'idea' ? 'Se me ocurrió que… (Enter para guardar)' : 'Tengo que… (Enter para guardar)'}
            style={{ flex: '1 1 300px' }}
          />
          <button className="btn primary" style={{ flex: '0 0 auto' }} onClick={add} disabled={!text.trim()}>
            Añadir
          </button>
        </div>
      </div>

      <div className="toolbar" style={{ marginTop: 16 }}>
        <Seg<Filter>
          options={[
            ['all', `Todo (${s.todos.filter((t) => !t.done).length})`],
            ['todo', `✅ Pendientes (${s.todos.filter((t) => !t.done && t.kind === 'todo').length})`],
            ['idea', `💡 Ideas (${s.todos.filter((t) => !t.done && t.kind === 'idea').length})`],
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {!s.todos.length ? (
        <Empty icon="📝">
          <b>Tu libreta de bolsillo.</b> ¿Se te ocurrió algo mientras leías o escribías? Anótalo aquí y sigue, sin perder el hilo.
          <br />
          Las ideas después se convierten en fichas con un clic.
        </Empty>
      ) : (
        <>
          {open.length ? (
            <div className="todo-list">
              {open.map((t) => (
                <TodoRow key={t.id} t={t} />
              ))}
            </div>
          ) : (
            <div className="meta" style={{ padding: '10px 2px' }}>
              Nada pendiente por aquí. 🎉
            </div>
          )}
          {done.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div className="row">
                <button className="btn sm ghost" style={{ flex: '0 0 auto' }} onClick={() => setShowDone(!showDone)}>
                  {showDone ? '▾' : '▸'} Hechos ({done.length})
                </button>
                {showDone && (
                  <button
                    className="btn sm ghost danger"
                    style={{ flex: '0 0 auto', marginLeft: 'auto' }}
                    onClick={() => update((d) => void (d.todos = d.todos.filter((t) => !(t.done && (filter === 'all' || t.kind === filter)))), `Limpiaste ${done.length} hechos`)}
                  >
                    Borrar hechos
                  </button>
                )}
              </div>
              {showDone && (
                <div className="todo-list" style={{ marginTop: 6 }}>
                  {done.map((t) => (
                    <TodoRow key={t.id} t={t} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}
